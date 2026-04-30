// Marble Kingdom Sim - Strategy Game Engine with Physics & Combat
class MarbleKingdomSim {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Game state
    this.turn = 0;
    this.running = false;
    this.speed = 1;
    this.zoom = 1.5;
    this.panX = 0;
    this.panY = 0;
    this.gameMode = 'world'; // 'world' or 'battle'
    
    // World map entities
    this.kingdoms = [];
    this.armies = [];
    this.towns = [];
    this.landmarks = [];
    
    // Battle arena
    this.activeBattle = null;
    this.battleMarbles = [];
    this.battleTime = 0;
    
    // Events log
    this.events = [];
    this.maxEvents = 50;
    
    // Animation loop
    this.lastUpdateTime = Date.now();
    this.frameCount = 0;
    this.fps = 60;
    
    // Setup
    this.setupEventListeners();
    this.animate();
  }
  
  setupEventListeners() {
    this.canvas.addEventListener('wheel', (e) => this.handleZoom(e));
    this.canvas.addEventListener('mousemove', (e) => this.handlePan(e));
  }
  
  handleZoom(event) {
    event.preventDefault();
    const zoomSpeed = 0.1;
    if (event.deltaY < 0) {
      this.zoom = Math.min(3, this.zoom + zoomSpeed);
    } else {
      this.zoom = Math.max(0.5, this.zoom - zoomSpeed);
    }
  }
  
  handlePan(event) {
    if (event.buttons === 2) {
      this.panX += event.movementX / this.zoom;
      this.panY += event.movementY / this.zoom;
    }
  }
  
  initializeGame(numKingdoms, numTowns) {
    this.kingdoms = [];
    this.armies = [];
    this.towns = [];
    this.landmarks = [];
    this.turn = 0;
    this.events = [];
    this.gameMode = 'world';
    
    const kingdomColors = [
      '#FF4444', '#4444FF', '#44FF44', '#FFFF44',
      '#FF44FF', '#44FFFF', '#FF8844', '#8844FF'
    ];
    
    // Create kingdoms
    for (let i = 0; i < numKingdoms; i++) {
      const kingdom = {
        id: i,
        name: `Kingdom ${i + 1}`,
        color: kingdomColors[i % kingdomColors.length],
        alive: true,
        totalFighters: 50,
        capturedTowns: 0,
        upgrades: []
      };
      this.kingdoms.push(kingdom);
    }
    
    // Create landmarks (forests, roads, mountains - decorative)
    for (let i = 0; i < 6; i++) {
      const types = ['forest', 'road', 'mountain'];
      this.landmarks.push({
        x: Math.random() * (this.canvas.width - 100) + 50,
        y: Math.random() * (this.canvas.height - 100) + 50,
        type: types[Math.floor(Math.random() * types.length)],
        size: 30 + Math.random() * 40
      });
    }
    
    // Create towns
    for (let i = 0; i < numTowns; i++) {
      const town = {
        id: i,
        x: Math.random() * (this.canvas.width - 100) + 50,
        y: Math.random() * (this.canvas.height - 100) + 50,
        owner: i < numKingdoms ? i : -1,
        garrison: i < numKingdoms ? 20 : 0,
        productionRate: 3,
        level: 1
      };
      this.towns.push(town);
    }
    
    // Create starting armies for each kingdom (single marble per army on world map)
    for (let i = 0; i < numKingdoms; i++) {
      const startTown = this.towns[i];
      const army = {
        id: `army_${i}`,
        kingdomId: i,
        x: startTown.x + (Math.random() - 0.5) * 100,
        y: startTown.y + (Math.random() - 0.5) * 100,
        vx: 0,
        vy: 0,
        targetX: null,
        targetY: null,
        fighters: 20, // Number of soldiers in this army
        radius: 12,
        speed: 1.5 + Math.random() * 0.5
      };
      this.armies.push(army);
    }
    
    this.addEvent(`Game started with ${numKingdoms} kingdoms and ${numTowns} towns!`);
    this.updateUI();
  }
  
  updateWorldMap() {
    if (this.gameMode !== 'world') return;
    
    // Move armies
    for (let army of this.armies) {
      if (!army.targetX || (Math.random() < 0.02 && this.turn % 30 === 0)) {
        const target = Math.random() < 0.7 ? 
          this.towns[Math.floor(Math.random() * this.towns.length)] :
          { x: Math.random() * (this.canvas.width - 200) + 100, y: Math.random() * (this.canvas.height - 200) + 100 };
        army.targetX = target.x;
        army.targetY = target.y;
      }
      
      const dx = army.targetX - army.x;
      const dy = army.targetY - army.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 15) {
        const moveSpeed = army.speed * this.speed * 0.5;
        army.vx = (dx / dist) * moveSpeed;
        army.vy = (dy / dist) * moveSpeed;
        army.x += army.vx;
        army.y += army.vy;
      } else {
        army.targetX = null;
        army.targetY = null;
        army.vx = 0;
        army.vy = 0;
      }
    }
    
    // Check army-town interactions
    for (let army of this.armies) {
      for (let town of this.towns) {
        const dx = town.x - army.x;
        const dy = town.y - army.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 40) {
          if (town.owner === army.kingdomId) {
            // Reinforce town
            const reinforcements = Math.min(5, 50 - army.fighters);
            army.fighters += reinforcements;
            town.garrison += reinforcements;
          } else {
            // Battle with town garrison
            this.startTownBattle(army, town);
            return;
          }
        }
      }
    }
    
    // Check army-army interactions
    for (let i = 0; i < this.armies.length; i++) {
      for (let j = i + 1; j < this.armies.length; j++) {
        const a1 = this.armies[i];
        const a2 = this.armies[j];
        
        if (a1.kingdomId === a2.kingdomId) continue;
        
        const dx = a2.x - a1.x;
        const dy = a2.y - a1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 50) {
          this.startBattle(a1, a2);
          return;
        }
      }
    }
    
    // Town production
    if (this.turn % 30 === 0) {
      for (let town of this.towns) {
        if (town.owner >= 0) {
          town.garrison += town.productionRate;
        }
      }
    }
    
    // Check for defeated kingdoms
    for (let kingdom of this.kingdoms) {
      if (!kingdom.alive) continue;
      const hasArmies = this.armies.some(a => a.kingdomId === kingdom.id);
      const hasTowns = this.towns.some(t => t.owner === kingdom.id);
      if (!hasArmies && !hasTowns) {
        kingdom.alive = false;
        this.addEvent(`Kingdom ${kingdom.id + 1} defeated!`, 'defeat');
      }
    }
    
    this.turn++;
  }
  
  startBattle(army1, army2) {
    this.gameMode = 'battle';
    this.activeBattle = { army1Id: army1.id, army2Id: army2.id, kingdomId1: army1.kingdomId, kingdomId2: army2.kingdomId };
    this.battleTime = 0;
    this.battleMarbles = [];
    
    const kingdom1 = this.kingdoms[army1.kingdomId];
    const kingdom2 = this.kingdoms[army2.kingdomId];
    
    // Create battle marbles (copy fighters from armies)
    for (let i = 0; i < army1.fighters; i++) {
      this.createBattleMarble(army1.kingdomId, army1.x - 150 + Math.random() * 100, army1.y - 150 + Math.random() * 100);
    }
    for (let i = 0; i < army2.fighters; i++) {
      this.createBattleMarble(army2.kingdomId, army2.x + 50 + Math.random() * 100, army2.y + 50 + Math.random() * 100);
    }
    
    this.addEvent(`Battle started: ${kingdom1.name} vs ${kingdom2.name}!`, 'battle');
  }
  
  startTownBattle(army, town) {
    this.gameMode = 'battle';
    this.activeBattle = { townId: town.id, armyId: army.id, kingdomId1: army.kingdomId, kingdomId2: town.owner };
    this.battleTime = 0;
    this.battleMarbles = [];
    
    // Create battle marbles
    for (let i = 0; i < army.fighters; i++) {
      this.createBattleMarble(army.kingdomId, Math.random() * 200, 200 + Math.random() * 100);
    }
    for (let i = 0; i < town.garrison; i++) {
      this.createBattleMarble(town.owner, 400 + Math.random() * 200, 200 + Math.random() * 100);
    }
  }
  
  createBattleMarble(kingdomId, x, y) {
    const marble = {
      kingdomId: kingdomId,
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      radius: 8,
      hp: 100,
      maxHp: 100,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: 0,
      sword: {
        length: 20,
        angle: 0, // Angle relative to marble rotation
        hinge: 0, // Hinge movement
        hingeSpeed: 0
      },
      alive: true,
      target: null
    };
    this.battleMarbles.push(marble);
  }
  
  updateBattle() {
    if (this.gameMode !== 'battle') return;
    
    this.battleTime++;
    const gravity = 0.3;
    const friction = 0.98;
    
    // Update each marble's physics
    for (let m of this.battleMarbles) {
      if (!m.alive) continue;
      
      // Apply physics
      m.vy += gravity;
      m.vx *= friction;
      m.vy *= friction;
      
      m.x += m.vx;
      m.y += m.vy;
      
      // Boundaries
      if (m.x - m.radius < 0) { m.x = m.radius; m.vx *= -0.8; }
      if (m.x + m.radius > 800) { m.x = 800 - m.radius; m.vx *= -0.8; }
      if (m.y + m.radius > 600) { m.y = 600 - m.radius; m.vy *= -0.8; }
      
      // Find nearest enemy
      if (!m.target || !m.target.alive || Math.random() < 0.01) {
        const enemies = this.battleMarbles.filter(e => e.alive && e.kingdomId !== m.kingdomId);
        if (enemies.length > 0) {
          m.target = enemies[Math.floor(Math.random() * enemies.length)];
        }
      }
      
      // Move toward target
      if (m.target && m.target.alive) {
        const dx = m.target.x - m.x;
        const dy = m.target.y - m.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 10) {
          m.vx += (dx / dist) * 0.3;
          m.vy += (dy / dist) * 0.3;
        }
        
        // Rotate sword toward target
        const targetAngle = Math.atan2(dy, dx);
        const angleDiff = targetAngle - m.rotation;
        m.rotationSpeed += angleDiff * 0.1;
        m.rotation += m.rotationSpeed * 0.1;
        m.rotationSpeed *= 0.9;
        
        // Sword hinge for swing motion
        m.sword.hingeSpeed += (Math.sin(this.battleTime * 0.05) * 0.1);
        m.sword.hinge += m.sword.hingeSpeed;
        m.sword.hingeSpeed *= 0.95;
        if (m.sword.hinge > 0.8) { m.sword.hinge = 0.8; m.sword.hingeSpeed *= -0.5; }
        if (m.sword.hinge < -0.8) { m.sword.hinge = -0.8; m.sword.hingeSpeed *= -0.5; }
      }
    }
    
    // Marble-to-marble collisions
    for (let i = 0; i < this.battleMarbles.length; i++) {
      for (let j = i + 1; j < this.battleMarbles.length; j++) {
        const m1 = this.battleMarbles[i];
        const m2 = this.battleMarbles[j];
        
        if (!m1.alive || !m2.alive) continue;
        
        const dx = m2.x - m1.x;
        const dy = m2.y - m1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < m1.radius + m2.radius) {
          // Collision response
          const nx = dx / dist;
          const ny = dy / dist;
          
          // Separate marbles
          const overlap = (m1.radius + m2.radius - dist) / 2;
          m1.x -= overlap * nx;
          m1.y -= overlap * ny;
          m2.x += overlap * nx;
          m2.y += overlap * ny;
          
          // Impulse exchange
          const dvx = m2.vx - m1.vx;
          const dvy = m2.vy - m1.vy;
          const dvn = dvx * nx + dvy * ny;
          
          if (dvn < 0) {
            const impulse = dvn * 0.5;
            m1.vx -= impulse * nx;
            m1.vy -= impulse * ny;
            m2.vx += impulse * nx;
            m2.vy += impulse * ny;
          }
          
          // Sword collision damage
          if (dist < m1.radius + 25) { // Sword reach
            const swordVelocity = Math.sqrt(m1.vx * m1.vx + m1.vy * m1.vy) + Math.abs(m1.sword.hingeSpeed) * 5;
            const damage = 10 + swordVelocity * 3;
            m2.hp -= damage;
            if (m2.hp <= 0) m2.alive = false;
          }
          if (dist < m2.radius + 25) {
            const swordVelocity = Math.sqrt(m2.vx * m2.vx + m2.vy * m2.vy) + Math.abs(m2.sword.hingeSpeed) * 5;
            const damage = 10 + swordVelocity * 3;
            m1.hp -= damage;
            if (m1.hp <= 0) m1.alive = false;
          }
        }
      }
    }
    
    // Check battle end condition
    const alive1 = this.battleMarbles.filter(m => m.alive && m.kingdomId === this.activeBattle.kingdomId1);
    const alive2 = this.battleMarbles.filter(m => m.alive && m.kingdomId === this.activeBattle.kingdomId2);
    
    if (alive1.length === 0 || alive2.length === 0 || this.battleTime > 3000) {
      this.endBattle(alive1, alive2);
    }
  }
  
  endBattle(survivors1, survivors2) {
    const k1Name = this.kingdoms[this.activeBattle.kingdomId1].name;
    const k2Name = this.kingdoms[this.activeBattle.kingdomId2].name;
    
    if (survivors1.length > survivors2.length) {
      this.addEvent(`${k1Name} won the battle!`, 'battle');
      
      // Update armies on world map
      for (let army of this.armies) {
        if (army.id === this.activeBattle.army1Id) {
          army.fighters = survivors1.length;
        } else if (army.id === this.activeBattle.army2Id) {
          army.fighters = Math.max(0, survivors2.length);
        }
        if (this.activeBattle.townId !== undefined) {
          const town = this.towns.find(t => t.id === this.activeBattle.townId);
          if (survivors1.length > survivors2.length && army.kingdomId === this.activeBattle.kingdomId1) {
            town.owner = army.kingdomId;
            town.garrison = survivors1.length;
          }
        }
      }
    } else if (survivors2.length > survivors1.length) {
      this.addEvent(`${k2Name} won the battle!`, 'battle');
    } else {
      this.addEvent(`Battle ended in a draw!`, 'battle');
    }
    
    this.gameMode = 'world';
    this.activeBattle = null;
  }
  
  update() {
    if (!this.running) return;
    
    if (this.gameMode === 'world') {
      this.updateWorldMap();
    } else if (this.gameMode === 'battle') {
      this.updateBattle();
    }
  }
  
  addEvent(text, type = 'info') {
    const time = `T${this.turn}`;
    this.events.unshift({ text, type, time });
    if (this.events.length > this.maxEvents) {
      this.events.pop();
    }
    this.updateEventLog();
  }
  
  draw() {
    if (this.gameMode === 'world') {
      this.drawWorldMap();
    } else if (this.gameMode === 'battle') {
      this.drawBattle();
    }
  }
  
  drawWorldMap() {
    // Clear canvas
    const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
    gradient.addColorStop(0, '#1a472a');
    gradient.addColorStop(1, '#2d5a3d');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.save();
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.scale(this.zoom, this.zoom);
    this.ctx.translate(-this.canvas.width / 2 + this.panX, -this.canvas.height / 2 + this.panY);
    
    // Draw landmarks
    for (let landmark of this.landmarks) {
      this.drawLandmark(landmark);
    }
    
    // Draw towns
    for (let town of this.towns) {
      this.drawTown(town);
    }
    
    // Draw armies (single marble)
    for (let army of this.armies) {
      this.drawWorldMarble(army);
    }
    
    this.ctx.restore();
    
    // Draw UI
    this.drawUI();
  }
  
  drawWorldMarble(army) {
    const kingdom = this.kingdoms[army.kingdomId];
    
    this.ctx.fillStyle = kingdom.color;
    this.ctx.globalAlpha = 0.9;
    this.ctx.beginPath();
    this.ctx.arc(army.x, army.y, army.radius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Shine
    const shineGrad = this.ctx.createRadialGradient(
      army.x - army.radius / 3, army.y - army.radius / 3, 0,
      army.x, army.y, army.radius
    );
    shineGrad.addColorStop(0, 'rgba(255,255,255,0.4)');
    shineGrad.addColorStop(1, 'rgba(255,255,255,0)');
    this.ctx.fillStyle = shineGrad;
    this.ctx.fill();
    
    // Border
    this.ctx.globalAlpha = 1;
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // Fighter count
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 10px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(army.fighters, army.x, army.y);
  }
  
  drawTown(town) {
    const kingdom = town.owner >= 0 ? this.kingdoms[town.owner] : null;
    const color = kingdom ? kingdom.color : '#888888';
    
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(town.x, town.y, 18, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(town.garrison, town.x, town.y);
  }
  
  drawLandmark(landmark) {
    this.ctx.save();
    this.ctx.globalAlpha = 0.3;
    
    if (landmark.type === 'forest') {
      this.ctx.fillStyle = '#2d5a2d';
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const x = landmark.x + Math.cos(angle) * 15;
        const y = landmark.y + Math.sin(angle) * 15;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 8, 0, Math.PI * 2);
        this.ctx.fill();
      }
    } else if (landmark.type === 'mountain') {
      this.ctx.fillStyle = '#6b5d5d';
      this.ctx.beginPath();
      this.ctx.moveTo(landmark.x, landmark.y - landmark.size / 2);
      this.ctx.lineTo(landmark.x + landmark.size / 2, landmark.y + landmark.size / 2);
      this.ctx.lineTo(landmark.x - landmark.size / 2, landmark.y + landmark.size / 2);
      this.ctx.fill();
    } else if (landmark.type === 'road') {
      this.ctx.strokeStyle = '#b8860b';
      this.ctx.lineWidth = 15;
      this.ctx.beginPath();
      this.ctx.moveTo(landmark.x - landmark.size / 2, landmark.y);
      this.ctx.lineTo(landmark.x + landmark.size / 2, landmark.y);
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }
  
  drawBattle() {
    // Battle arena background
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Grid
    this.ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)';
    this.ctx.lineWidth = 1;
    for (let x = 0; x < this.canvas.width; x += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.canvas.height; y += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
    
    // Draw battle marbles
    for (let m of this.battleMarbles) {
      this.drawBattleMarble(m);
    }
    
    // Battle info
    this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
    this.ctx.fillRect(10, 10, 300, 60);
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.fillText('BATTLE ARENA', 20, 35);
    this.ctx.font = '12px Arial';
    const k1 = this.kingdoms[this.activeBattle.kingdomId1];
    const k2 = this.kingdoms[this.activeBattle.kingdomId2];
    const alive1 = this.battleMarbles.filter(m => m.alive && m.kingdomId === this.activeBattle.kingdomId1).length;
    const alive2 = this.battleMarbles.filter(m => m.alive && m.kingdomId === this.activeBattle.kingdomId2).length;
    this.ctx.fillText(`${k1.name}: ${alive1}  |  ${k2.name}: ${alive2}`, 20, 55);
  }
  
  drawBattleMarble(m) {
    if (!m.alive) return;
    
    const kingdom = this.kingdoms[m.kingdomId];
    
    // Draw marble
    this.ctx.fillStyle = kingdom.color;
    this.ctx.globalAlpha = 0.9;
    this.ctx.beginPath();
    this.ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Shine
    const shineGrad = this.ctx.createRadialGradient(
      m.x - m.radius / 2, m.y - m.radius / 2, 0,
      m.x, m.y, m.radius
    );
    shineGrad.addColorStop(0, 'rgba(255,255,255,0.3)');
    shineGrad.addColorStop(1, 'rgba(255,255,255,0)');
    this.ctx.fillStyle = shineGrad;
    this.ctx.fill();
    
    this.ctx.globalAlpha = 1;
    
    // Draw sword
    const swordX = m.x + Math.cos(m.rotation) * m.radius;
    const swordY = m.y + Math.sin(m.rotation) * m.radius;
    
    // Sword hilt (fixed to marble)
    this.ctx.fillStyle = '#8B4513';
    this.ctx.beginPath();
    this.ctx.arc(swordX, swordY, 4, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Sword blade with hinge movement
    const swordAngle = m.rotation + m.sword.hinge;
    const swordEndX = swordX + Math.cos(swordAngle) * m.sword.length;
    const swordEndY = swordY + Math.sin(swordAngle) * m.sword.length;
    
    this.ctx.strokeStyle = '#C0C0C0';
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(swordX, swordY);
    this.ctx.lineTo(swordEndX, swordEndY);
    this.ctx.stroke();
    
    // HP bar
    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(m.x - 10, m.y - m.radius - 15, 20, 4);
    const hpPercent = m.hp / m.maxHp;
    this.ctx.fillStyle = hpPercent > 0.5 ? '#00FF00' : hpPercent > 0.25 ? '#FFFF00' : '#FF0000';
    this.ctx.fillRect(m.x - 10, m.y - m.radius - 15, 20 * hpPercent, 4);
  }
  
  drawUI() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(10, 10, 180, 100);
    
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Turn: ${this.turn}`, 20, 30);
    this.ctx.font = '12px Arial';
    this.ctx.fillText(`Armies: ${this.armies.length}`, 20, 48);
    this.ctx.fillText(`Mode: ${this.gameMode.toUpperCase()}`, 20, 63);
    this.ctx.fillText(`Towns: ${this.towns.length}`, 20, 78);
    this.ctx.fillText(`Alive: ${this.kingdoms.filter(k => k.alive).length}/${this.kingdoms.length}`, 20, 93);
  }
  
  togglePlayPause() {
    this.running = !this.running;
    this.updatePlayButton();
  }
  
  updatePlayButton() {
    document.getElementById('pausePlayBtn').textContent = this.running ? '⏸ Pause' : '▶ Play';
    document.getElementById('pausePlayBtn2').textContent = this.running ? '⏸ Pause' : '▶ Play';
  }
  
  updateUI() {
    document.getElementById('turnCounter').textContent = this.turn;
    document.getElementById('armyCount').textContent = this.armies.length;
    this.updateKingdomsList();
    this.updateEventLog();
  }
  
  updateKingdomsList() {
    const list = document.getElementById('kingdomsList');
    list.innerHTML = '';
    
    for (let kingdom of this.kingdoms) {
      const div = document.createElement('div');
      div.className = `kingdom-item ${kingdom.alive ? 'alive' : 'dead'}`;
      
      const numArmies = this.armies.filter(a => a.kingdomId === kingdom.id).length;
      const numTowns = this.towns.filter(t => t.owner === kingdom.id).length;
      
      div.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 12px; height: 12px; background: ${kingdom.color}; border-radius: 2px;"></div>
          <strong>${kingdom.name}</strong>
        </div>
        <div class="kingdom-stat">
          <span><label>A</label>${numArmies}</span>
          <span><label>T</label>${numTowns}</span>
        </div>
      `;
      
      list.appendChild(div);
    }
  }
  
  updateEventLog() {
    const log = document.getElementById('eventLog');
    log.innerHTML = '';
    
    for (let event of this.events) {
      const div = document.createElement('div');
      div.className = `log-entry ${event.type}`;
      div.textContent = `[${event.time}] ${event.text}`;
      log.appendChild(div);
    }
  }
  
  animate() {
    this.update();
    this.draw();
    
    if (this.turn % 10 === 0 && this.gameMode === 'world') {
      this.updateUI();
    }
    
    requestAnimationFrame(() => this.animate());
  }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const game = new MarbleKingdomSim(canvas);
  
  // Start button
  document.getElementById('startBtn').addEventListener('click', () => {
    const numKingdoms = parseInt(document.getElementById('numKingdoms').value);
    const numTowns = parseInt(document.getElementById('numTowns').value);
    game.initializeGame(numKingdoms, numTowns);
    game.running = true;
    game.updatePlayButton();
  });
  
  // Play/Pause buttons
  document.getElementById('pausePlayBtn').addEventListener('click', () => {
    game.togglePlayPause();
  });
  
  document.getElementById('pausePlayBtn2').addEventListener('click', () => {
    game.togglePlayPause();
  });
  
  // Reset button
  document.getElementById('resetBtn').addEventListener('click', () => {
    game.running = false;
    game.kingdoms = [];
    game.armies = [];
    game.towns = [];
    game.turn = 0;
    game.events = [];
    game.gameMode = 'world';
    game.updateUI();
    game.updatePlayButton();
  });
  
  // Clear button
  document.getElementById('clearCanvasBtn').addEventListener('click', () => {
    document.getElementById('resetBtn').click();
  });
  
  // Speed slider
  document.getElementById('speedSlider').addEventListener('input', (e) => {
    game.speed = parseInt(e.target.value);
    document.getElementById('speedValue').textContent = game.speed + 'x';
  });
  
  // Zoom buttons
  document.getElementById('zoomInBtn').addEventListener('click', () => {
    game.zoom = Math.min(3, game.zoom + 0.2);
  });
  
  document.getElementById('zoomOutBtn').addEventListener('click', () => {
    game.zoom = Math.max(0.5, game.zoom - 0.2);
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      game.togglePlayPause();
    }
  });
});
