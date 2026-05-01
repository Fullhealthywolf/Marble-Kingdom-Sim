// Marble Kingdom Sim - Top-Down Strategy with Physics-Based Combat
class MarbleKingdomSim {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Game state
    this.turn = 0;
    this.running = false;
    this.speed = 1;
    this.gameMode = 'world'; // 'world' or 'battle'
    
    // World map
    this.kingdoms = [];
    this.worldArmies = [];
    this.towns = [];
    this.landmarks = [];
    
    // Battle
    this.activeBattle = null;
    this.battleMarbles = [];
    this.battleTime = 0;
    
    // Events
    this.events = [];
    this.maxEvents = 50;
    
    // Animation
    this.frameCount = 0;
    this.fps = 60;
    
    this.setupEventListeners();
    this.animate();
  }
  
  setupEventListeners() {
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  
  initializeGame(numKingdoms, numTowns) {
    this.kingdoms = [];
    this.worldArmies = [];
    this.towns = [];
    this.landmarks = [];
    this.turn = 0;
    this.events = [];
    this.gameMode = 'world';
    this.activeBattle = null;
    
    const kingdomColors = [
      '#FF4444', '#4444FF', '#44FF44', '#FFFF44',
      '#FF44FF', '#44FFFF', '#FF8844', '#8844FF'
    ];
    
    // Create kingdoms
    for (let i = 0; i < numKingdoms; i++) {
      this.kingdoms.push({
        id: i,
        name: `Kingdom ${i + 1}`,
        color: kingdomColors[i % kingdomColors.length],
        alive: true,
        upgrades: []
      });
    }
    
    // Create landmarks
    for (let i = 0; i < 8; i++) {
      const types = ['forest', 'road', 'mountain'];
      this.landmarks.push({
        x: Math.random() * (this.canvas.width * 0.8) + this.canvas.width * 0.1,
        y: Math.random() * (this.canvas.height * 0.8) + this.canvas.height * 0.1,
        type: types[Math.floor(Math.random() * types.length)],
        size: 40 + Math.random() * 60
      });
    }
    
    // Create towns
    for (let i = 0; i < numTowns; i++) {
      this.towns.push({
        id: i,
        x: Math.random() * (this.canvas.width * 0.8) + this.canvas.width * 0.1,
        y: Math.random() * (this.canvas.height * 0.8) + this.canvas.height * 0.1,
        owner: i < numKingdoms ? i : -1,
        garrison: i < numKingdoms ? 50 : 0,
        productionRate: 5,
        level: 1
      });
    }
    
    // Create starting armies (single marble per army on world map)
    for (let i = 0; i < numKingdoms; i++) {
      const startTown = this.towns[i];
      this.worldArmies.push({
        id: `army_${i}_0`,
        kingdomId: i,
        x: startTown.x + (Math.random() - 0.5) * 150,
        y: startTown.y + (Math.random() - 0.5) * 150,
        vx: 0,
        vy: 0,
        marbleCount: 20,
        targetX: null,
        targetY: null,
        speed: 1.5,
        radius: 25
      });
    }
    
    this.addEvent(`Game started with ${numKingdoms} kingdoms!`);
    this.updateUI();
  }
  
  update() {
    if (!this.running) return;
    
    if (this.gameMode === 'world') {
      this.updateWorld();
    } else if (this.gameMode === 'battle') {
      this.updateBattle();
    }
  }
  
  updateWorld() {
    // Move armies
    for (let army of this.worldArmies) {
      if (!army.targetX || Math.random() < 0.01) {
        const randomTown = this.towns[Math.floor(Math.random() * this.towns.length)];
        army.targetX = randomTown.x + (Math.random() - 0.5) * 80;
        army.targetY = randomTown.y + (Math.random() - 0.5) * 80;
      }
      
      const dx = army.targetX - army.x;
      const dy = army.targetY - army.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 10) {
        const moveSpeed = 0.5 * this.speed; // Very slow
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
      
      // Friction
      army.vx *= 0.95;
      army.vy *= 0.95;
    }
    
    // Check town interactions
    for (let army of this.worldArmies) {
      for (let town of this.towns) {
        const dx = town.x - army.x;
        const dy = town.y - army.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < army.radius + 25) {
          if (town.owner === army.kingdomId) {
            // Reinforce
            town.garrison = Math.min(town.garrison + 10, 200);
          } else {
            // Battle!
            this.startBattle(army, town);
            return;
          }
        }
      }
    }
    
    // Check army-army collisions
    for (let i = 0; i < this.worldArmies.length; i++) {
      for (let j = i + 1; j < this.worldArmies.length; j++) {
        const a1 = this.worldArmies[i];
        const a2 = this.worldArmies[j];
        if (a1.kingdomId === a2.kingdomId) continue;
        
        const dx = a2.x - a1.x;
        const dy = a2.y - a1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < a1.radius + a2.radius + 20) {
          this.startArmyBattle(a1, a2);
          return;
        }
      }
    }
    
    // Production
    if (this.turn % 50 === 0) {
      for (let town of this.towns) {
        if (town.owner >= 0) {
          town.garrison += town.productionRate;
        }
      }
    }
    
    // Check defeated kingdoms
    for (let kingdom of this.kingdoms) {
      if (!kingdom.alive) continue;
      const hasArmies = this.worldArmies.some(a => a.kingdomId === kingdom.id);
      const hasTowns = this.towns.some(t => t.owner === kingdom.id);
      if (!hasArmies && !hasTowns) {
        kingdom.alive = false;
        this.addEvent(`${kingdom.name} defeated!`, 'defeat');
      }
    }
    
    this.turn++;
  }
  
  startBattle(army, town) {
    this.gameMode = 'battle';
    this.battleTime = 0;
    
    const kingdom = this.kingdoms[army.kingdomId];
    
    this.activeBattle = {
      armyId: army.id,
      townId: town.id,
      armyKingdomId: army.kingdomId,
      townKingdomId: town.owner
    };
    
    // Create battle marbles - each one is a soldier
    this.battleMarbles = [];
    
    // Attacking army soldiers
    for (let i = 0; i < army.marbleCount; i++) {
      this.battleMarbles.push(this.createBattleMarble(army.kingdomId, i, true));
    }
    
    // Defending town soldiers
    for (let i = 0; i < town.garrison; i++) {
      this.battleMarbles.push(this.createBattleMarble(town.owner, i, false));
    }
    
    this.addEvent(`Battle: ${kingdom.name} attacks a town!`, 'battle');
  }
  
  startArmyBattle(a1, a2) {
    this.gameMode = 'battle';
    this.battleTime = 0;
    
    this.activeBattle = {
      army1Id: a1.id,
      army2Id: a2.id,
      army1KingdomId: a1.kingdomId,
      army2KingdomId: a2.kingdomId
    };
    
    this.battleMarbles = [];
    
    // Army 1 soldiers
    for (let i = 0; i < a1.marbleCount; i++) {
      this.battleMarbles.push(this.createBattleMarble(a1.kingdomId, i, true));
    }
    
    // Army 2 soldiers
    for (let i = 0; i < a2.marbleCount; i++) {
      this.battleMarbles.push(this.createBattleMarble(a2.kingdomId, i, false));
    }
    
    this.addEvent(
      `Battle: ${this.kingdoms[a1.kingdomId].name} vs ${this.kingdoms[a2.kingdomId].name}!`,
      'battle'
    );
  }
  
  createBattleMarble(kingdomId, index, isAttacker) {
    const canvas = this.canvas;
    // Spread marbles in a circle, attackers on left, defenders on right
    const angle = (index / Math.max(1, isAttacker ? 15 : 20)) * Math.PI * 2;
    const spawnRadius = 150; // Distance from center to spawn
    
    let x, y;
    if (isAttacker) {
      // Left side
      x = canvas.width / 4 + Math.cos(angle) * spawnRadius;
      y = canvas.height / 2 + Math.sin(angle) * spawnRadius;
    } else {
      // Right side
      x = (canvas.width * 3) / 4 + Math.cos(angle) * spawnRadius;
      y = canvas.height / 2 + Math.sin(angle) * spawnRadius;
    }
    
    return {
      x: x,
      y: y,
      vx: 0,
      vy: 0,
      radius: 30,
      kingdomId: kingdomId,
      isAttacker: isAttacker,
      hp: 100,
      maxHp: 100,
      damage: 20,
      rotation: Math.random() * Math.PI * 2,
      angularVelocity: 0,
      swordRotation: 0,
      swordHinge: 0,
      targetMarble: null
    };
  }
  
  updateBattle() {
    this.battleTime++;
    
    // Remove dead marbles
    this.battleMarbles = this.battleMarbles.filter(m => m.hp > 0);
    
    // Check if battle is over
    const attackersAlive = this.battleMarbles.filter(m => m.isAttacker && m.kingdomId === this.activeBattle.armyKingdomId).length;
    const defendersAlive = this.battleMarbles.filter(m => !m.isAttacker).length;
    
    if (attackersAlive === 0 || defendersAlive === 0) {
      this.endBattle(attackersAlive > 0);
      return;
    }
    
    // Battle AI and physics
    for (let marble of this.battleMarbles) {
      if (marble.hp <= 0) continue;
      
      // Find nearest enemy
      let nearestEnemy = null;
      let nearestDist = 300;
      
      for (let other of this.battleMarbles) {
        if (other.kingdomId !== marble.kingdomId && other.hp > 0) {
          const dx = other.x - marble.x;
          const dy = other.y - marble.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < nearestDist) {
            nearestEnemy = other;
            nearestDist = dist;
          }
        }
      }
      
      if (nearestEnemy) {
        // Move toward enemy
        const dx = nearestEnemy.x - marble.x;
        const dy = nearestEnemy.y - marble.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 5) {
          const moveSpeed = 1.0; // Faster movement
          marble.vx += (dx / dist) * moveSpeed;
          marble.vy += (dy / dist) * moveSpeed;
        }
        
        // Rotate toward enemy
        const targetAngle = Math.atan2(dy, dx);
        marble.rotation = targetAngle;
        marble.swordRotation = targetAngle;
        
        // Attack if close
        if (dist < 120) {
          const swordX = marble.x + Math.cos(marble.swordRotation) * 60;
          const swordY = marble.y + Math.sin(marble.swordRotation) * 60;
          const swordDist = Math.sqrt(
            Math.pow(swordX - nearestEnemy.x, 2) + 
            Math.pow(swordY - nearestEnemy.y, 2)
          );
          
          if (swordDist < 50) {
            // Sword hit! Damage based on velocity
            const velocity = Math.sqrt(marble.vx ** 2 + marble.vy ** 2);
            const baseDamage = marble.damage;
            const velocityDamage = velocity * 15;
            const totalDamage = baseDamage + velocityDamage;
            
            nearestEnemy.hp -= totalDamage;
          }
        }
      }
      
      // Apply friction
      marble.vx *= 0.85;
      marble.vy *= 0.85;
      
      // Speed cap
      const speed = Math.sqrt(marble.vx ** 2 + marble.vy ** 2);
      if (speed > 3) {
        marble.vx = (marble.vx / speed) * 3;
        marble.vy = (marble.vy / speed) * 3;
      }
      
      // Update position
      marble.x += marble.vx;
      marble.y += marble.vy;
      
      // Boundary collision
      if (marble.x - marble.radius < 0) {
        marble.x = marble.radius;
        marble.vx *= -0.5;
      } else if (marble.x + marble.radius > this.canvas.width) {
        marble.x = this.canvas.width - marble.radius;
        marble.vx *= -0.5;
      }
      
      if (marble.y - marble.radius < 0) {
        marble.y = marble.radius;
        marble.vy *= -0.5;
      } else if (marble.y + marble.radius > this.canvas.height) {
        marble.y = this.canvas.height - marble.radius;
        marble.vy *= -0.5;
      }
    }
    
    // Marble-marble collisions (apply after all movement to avoid stacking)
    for (let i = 0; i < this.battleMarbles.length; i++) {
      for (let j = i + 1; j < this.battleMarbles.length; j++) {
        const marble = this.battleMarbles[i];
        const other = this.battleMarbles[j];
        
        if (marble.hp <= 0 || other.hp <= 0) continue;
        
        const dx = other.x - marble.x;
        const dy = other.y - marble.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = marble.radius + other.radius;
        
        if (dist < minDist && dist > 0) {
          const nx = dx / dist;
          const ny = dy / dist;
          
          const dvx = other.vx - marble.vx;
          const dvy = other.vy - marble.vy;
          const dvn = dvx * nx + dvy * ny;
          
          if (dvn < 0) {
            const impulse = -dvn * 0.6;
            marble.vx -= impulse * nx;
            marble.vy -= impulse * ny;
            other.vx += impulse * nx;
            other.vy += impulse * ny;
            
            // Separate marbles to prevent stacking
            const overlap = (minDist - dist) / 2 + 0.5;
            marble.x -= overlap * nx;
            marble.y -= overlap * ny;
            other.x += overlap * nx;
            other.y += overlap * ny;
          }
        }
      }
    }
  }
  
  endBattle(attackerWon) {
    this.gameMode = 'world';
    
    const attackerKingdom = this.kingdoms[this.activeBattle.armyKingdomId];
    
    if (this.activeBattle.townId !== undefined) {
      // Town battle
      const town = this.towns.find(t => t.id === this.activeBattle.townId);
      const survivors = this.battleMarbles.filter(m => m.isAttacker && m.hp > 0).length;
      
      if (attackerWon) {
        const oldOwner = town.owner >= 0 ? this.kingdoms[town.owner].name : 'neutral';
        town.owner = this.activeBattle.armyKingdomId;
        town.garrison = Math.max(1, survivors);
        this.addEvent(`${attackerKingdom.name} captured a town!`, 'capture');
      } else {
        const defenderKingdom = this.kingdoms[town.owner];
        town.garrison = this.battleMarbles.filter(m => !m.isAttacker && m.hp > 0).length;
        this.addEvent(`${defenderKingdom.name} defended their town!`, 'defend');
      }
      
      const army = this.worldArmies.find(a => a.id === this.activeBattle.armyId);
      if (army) {
        army.marbleCount = survivors;
        if (survivors === 0) {
          this.worldArmies = this.worldArmies.filter(a => a.id !== army.id);
        }
      }
    } else {
      // Army battle
      const survivors1 = this.battleMarbles.filter(m => m.kingdomId === this.activeBattle.army1KingdomId && m.hp > 0).length;
      const survivors2 = this.battleMarbles.filter(m => m.kingdomId === this.activeBattle.army2KingdomId && m.hp > 0).length;
      
      const army1 = this.worldArmies.find(a => a.id === this.activeBattle.army1Id);
      const army2 = this.worldArmies.find(a => a.id === this.activeBattle.army2Id);
      
      if (army1) army1.marbleCount = survivors1;
      if (army2) army2.marbleCount = survivors2;
      
      if (survivors1 === 0) this.worldArmies = this.worldArmies.filter(a => a !== army1);
      if (survivors2 === 0) this.worldArmies = this.worldArmies.filter(a => a !== army2);
      
      const winner = survivors1 > survivors2 ? this.kingdoms[this.activeBattle.army1KingdomId] : this.kingdoms[this.activeBattle.army2KingdomId];
      this.addEvent(`${winner.name} won the battle!`, 'battle');
    }
    
    this.activeBattle = null;
    this.battleMarbles = [];
  }
  
  addEvent(text, type = 'info') {
    this.events.unshift({ text, type, time: this.turn });
    if (this.events.length > this.maxEvents) this.events.pop();
    this.updateEventLog();
  }
  
  draw() {
    if (this.gameMode === 'world') {
      this.drawWorld();
    } else {
      this.drawBattle();
    }
  }
  
  drawWorld() {
    // Background
    const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
    gradient.addColorStop(0, '#1a472a');
    gradient.addColorStop(1, '#2d5a3d');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw landmarks
    for (let landmark of this.landmarks) {
      this.drawLandmark(landmark);
    }
    
    // Draw towns
    for (let town of this.towns) {
      const color = town.owner >= 0 ? this.kingdoms[town.owner].color : '#888888';
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
    
    // Draw armies (single large marble)
    for (let army of this.worldArmies) {
      const color = this.kingdoms[army.kingdomId].color;
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(army.x, army.y, army.radius, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Shine
      const grad = this.ctx.createRadialGradient(
        army.x - army.radius / 3, army.y - army.radius / 3, 0,
        army.x, army.y, army.radius
      );
      grad.addColorStop(0, 'rgba(255,255,255,0.3)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      this.ctx.fillStyle = grad;
      this.ctx.fill();
      
      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 14px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(army.marbleCount, army.x, army.y);
    }
    
    // UI
    this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
    this.ctx.fillRect(10, 10, 200, 80);
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Turn: ${this.turn}`, 20, 30);
    this.ctx.font = '12px Arial';
    this.ctx.fillText(`Armies: ${this.worldArmies.length}`, 20, 48);
    this.ctx.fillText(`Towns: ${this.towns.length}`, 20, 63);
    this.ctx.fillText(`Mode: World Map`, 20, 78);
  }
  
  drawBattle() {
    // Background
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw battle marbles with swords
    for (let marble of this.battleMarbles) {
      const color = this.kingdoms[marble.kingdomId].color;
      
      // Draw marble
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(marble.x, marble.y, marble.radius, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Shine
      const grad = this.ctx.createRadialGradient(
        marble.x - marble.radius / 3, marble.y - marble.radius / 3, 0,
        marble.x, marble.y, marble.radius
      );
      grad.addColorStop(0, 'rgba(255,255,255,0.4)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      this.ctx.fillStyle = grad;
      this.ctx.fill();
      
      // HP bar
      this.ctx.fillStyle = '#ff4444';
      this.ctx.fillRect(marble.x - 20, marble.y - marble.radius - 15, 40, 5);
      this.ctx.fillStyle = '#44ff44';
      this.ctx.fillRect(marble.x - 20, marble.y - marble.radius - 15, 40 * (marble.hp / marble.maxHp), 5);
      
      // Draw sword
      const swordLength = 80;
      const swordX = marble.x + Math.cos(marble.swordRotation) * marble.radius;
      const swordY = marble.y + Math.sin(marble.swordRotation) * marble.radius;
      const swordEndX = swordX + Math.cos(marble.swordRotation) * swordLength;
      const swordEndY = swordY + Math.sin(marble.swordRotation) * swordLength;
      
      this.ctx.strokeStyle = '#c0c0c0';
      this.ctx.lineWidth = 12;
      this.ctx.lineCap = 'round';
      this.ctx.beginPath();
      this.ctx.moveTo(swordX, swordY);
      this.ctx.lineTo(swordEndX, swordEndY);
      this.ctx.stroke();
      
      // Sword tip
      this.ctx.fillStyle = '#ffff00';
      this.ctx.beginPath();
      this.ctx.arc(swordEndX, swordEndY, 6, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    // UI
    this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
    this.ctx.fillRect(10, 10, 250, 100);
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('BATTLE IN PROGRESS', 20, 30);
    this.ctx.font = '12px Arial';
    const attackerCount = this.battleMarbles.filter(m => m.isAttacker && m.hp > 0).length;
    const defenderCount = this.battleMarbles.filter(m => !m.isAttacker && m.hp > 0).length;
    this.ctx.fillText(`Attackers: ${attackerCount}`, 20, 48);
    this.ctx.fillText(`Defenders: ${defenderCount}`, 20, 63);
    this.ctx.fillText(`Battle Time: ${Math.floor(this.battleTime / 60)}s`, 20, 78);
    this.ctx.fillText(`Mode: Battle Arena (Full Screen)`, 20, 93);
  }
  
  drawLandmark(landmark) {
    this.ctx.save();
    this.ctx.globalAlpha = 0.25;
    
    if (landmark.type === 'forest') {
      this.ctx.fillStyle = '#2d5a2d';
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const x = landmark.x + Math.cos(angle) * 20;
        const y = landmark.y + Math.sin(angle) * 20;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 10, 0, Math.PI * 2);
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
      this.ctx.lineWidth = 20;
      this.ctx.beginPath();
      this.ctx.moveTo(landmark.x - landmark.size / 2, landmark.y);
      this.ctx.lineTo(landmark.x + landmark.size / 2, landmark.y);
      this.ctx.stroke();
    }
    
    this.ctx.restore();
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
    document.getElementById('armyCount').textContent = this.worldArmies.length;
    this.updateKingdomsList();
    this.updateEventLog();
  }
  
  updateKingdomsList() {
    const list = document.getElementById('kingdomsList');
    list.innerHTML = '';
    
    for (let kingdom of this.kingdoms) {
      const div = document.createElement('div');
      div.className = `kingdom-item ${kingdom.alive ? 'alive' : 'dead'}`;
      
      const numArmies = this.worldArmies.filter(a => a.kingdomId === kingdom.id).length;
      const numMarbles = this.worldArmies.reduce((sum, a) => a.kingdomId === kingdom.id ? sum + a.marbleCount : sum, 0);
      const numTowns = this.towns.filter(t => t.owner === kingdom.id).length;
      
      div.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 12px; height: 12px; background: ${kingdom.color}; border-radius: 2px;"></div>
          <strong>${kingdom.name}</strong>
        </div>
        <div class="kingdom-stat">
          <span><label>A</label>${numArmies}</span>
          <span><label>M</label>${numMarbles}</span>
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
      div.textContent = `[T${event.time}] ${event.text}`;
      log.appendChild(div);
    }
  }
  
  animate() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.animate());
  }
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const game = new MarbleKingdomSim(canvas);
  
  document.getElementById('startBtn').addEventListener('click', () => {
    const numKingdoms = parseInt(document.getElementById('numKingdoms').value);
    const numTowns = parseInt(document.getElementById('numTowns').value);
    game.initializeGame(numKingdoms, numTowns);
    game.running = true;
    game.updatePlayButton();
  });
  
  document.getElementById('pausePlayBtn').addEventListener('click', () => {
    game.togglePlayPause();
  });
  
  document.getElementById('pausePlayBtn2').addEventListener('click', () => {
    game.togglePlayPause();
  });
  
  document.getElementById('resetBtn').addEventListener('click', () => {
    game.running = false;
    game.gameMode = 'world';
    game.kingdoms = [];
    game.worldArmies = [];
    game.towns = [];
    game.turn = 0;
    game.events = [];
    game.updateUI();
    game.updatePlayButton();
  });
  
  document.getElementById('clearCanvasBtn').addEventListener('click', () => {
    document.getElementById('resetBtn').click();
  });
  
  document.getElementById('speedSlider').addEventListener('input', (e) => {
    game.speed = parseInt(e.target.value);
    document.getElementById('speedValue').textContent = game.speed + 'x';
  });
  
  document.getElementById('zoomInBtn').addEventListener('click', () => {
    // Zoom controlled in canvas already
  });
  
  document.getElementById('zoomOutBtn').addEventListener('click', () => {
    // Zoom controlled in canvas already
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      game.togglePlayPause();
    }
  });
});
