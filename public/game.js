// Marble Kingdom Sim - Strategy Game Engine with Physics & Power-ups
class MarbleKingdomSim {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Game state
    this.turn = 0;
    this.running = false;
    this.speed = 1;
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    
    // Game entities
    this.kingdoms = [];
    this.armies = [];
    this.towns = [];
    this.landmarks = [];
    this.battleArenas = [];
    this.activeBattle = null;
    
    // Events log
    this.events = [];
    this.maxEvents = 50;
    
    // Power-ups pool
    this.powerUpsPool = this.initializePowerUpsPool();
    
    // Animation loop
    this.lastUpdateTime = Date.now();
    this.frameCount = 0;
    this.fps = 60;
    
    // Setup
    this.setupEventListeners();
    this.animate();
  }
  
  initializePowerUpsPool() {
    return [
      { name: 'Increase HP', effect: 'hp', value: 100 },
      { name: 'Weapon Damage', effect: 'damage', value: 50 },
      { name: 'Speed Boost', effect: 'speed', value: 0.5 },
      { name: 'Size Increase', effect: 'size', value: 1.2 },
      { name: 'Armor', effect: 'armor', value: 50 },
      { name: 'HP Regen', effect: 'regen', value: 5 },
      { name: 'Critical Strike', effect: 'crit', value: 0.2 },
      { name: 'Splash Damage', effect: 'splash', value: 1.5 },
      { name: 'Reduce Cooldown', effect: 'cooldown', value: 0.8 },
      { name: 'Extra Fighters', effect: 'fighters', value: 10 }
    ];
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
    this.activeBattle = null;
    
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
        level: 1,
        siege: false
      };
      this.towns.push(town);
    }
    
    // Create starting armies for each kingdom
    for (let i = 0; i < numKingdoms; i++) {
      const startTown = this.towns[i];
      const army = {
        id: `army_${i}_0`,
        kingdomId: i,
        x: startTown.x + (Math.random() - 0.5) * 100,
        y: startTown.y + (Math.random() - 0.5) * 100,
        targetX: null,
        targetY: null,
        marbles: [],
        speed: 1.5 + Math.random() * 0.5,
        morale: 100
      };
      
      // Start with 20 marbles per kingdom
      for (let j = 0; j < 20; j++) {
        army.marbles.push(this.createMarble(army.kingdomId, 0));
      }
      
      this.armies.push(army);
    }
    
    this.addEvent(`Game started with ${numKingdoms} kingdoms and ${numTowns} towns!`);
    this.updateUI();
  }
  
  createMarble(kingdomId, level = 0) {
    const baseSize = 6;
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: baseSize + (level * 1.5),
      hp: 100 + (level * 20),
      maxHp: 100 + (level * 20),
      damage: 10 + (level * 5),
      speed: 2 + (level * 0.5),
      level: level,
      upgrades: []
    };
  }
  
  grantRandomUpgrade(kingdomId) {
    const kingdom = this.kingdoms[kingdomId];
    const randomPowerUp = this.powerUpsPool[Math.floor(Math.random() * this.powerUpsPool.length)];
    
    kingdom.upgrades.push(randomPowerUp);
    
    // Apply to all marbles in armies
    for (let army of this.armies) {
      if (army.kingdomId === kingdomId) {
        for (let marble of army.marbles) {
          this.applyUpgrade(marble, randomPowerUp);
        }
      }
    }
    
    this.addEvent(`${kingdom.name} received: ${randomPowerUp.name}!`, 'capture');
  }
  
  applyUpgrade(marble, upgrade) {
    switch(upgrade.effect) {
      case 'hp':
        marble.maxHp += upgrade.value;
        marble.hp = marble.maxHp;
        break;
      case 'damage':
        marble.damage += upgrade.value;
        break;
      case 'speed':
        marble.speed *= upgrade.value;
        break;
      case 'size':
        marble.radius *= upgrade.value;
        break;
      case 'armor':
        marble.armor = (marble.armor || 0) + upgrade.value;
        break;
      case 'regen':
        marble.regen = (marble.regen || 0) + upgrade.value;
        break;
      case 'crit':
        marble.critChance = (marble.critChance || 0) + upgrade.value;
        break;
      case 'splash':
        marble.splashDamage = upgrade.value;
        break;
      case 'cooldown':
        marble.cooldownReduction = upgrade.value;
        break;
      case 'fighters':
        // Additional fighters handled separately
        break;
    }
    marble.upgrades.push(upgrade);
  }
  
  update() {
    if (!this.running) return;
    
    // Move armies toward random targets
    for (let army of this.armies) {
      if (army.marbles.length === 0) continue;
      
      if (!army.targetX || (Math.random() < 0.02 && this.turn % 20 === 0)) {
        // Pick random target
        const target = Math.random() < 0.6 ? 
          this.towns[Math.floor(Math.random() * this.towns.length)] :
          {
            x: Math.random() * (this.canvas.width - 200) + 100,
            y: Math.random() * (this.canvas.height - 200) + 100
          };
        army.targetX = target.x;
        army.targetY = target.y;
      }
      
      // Move army center of mass
      const dx = army.targetX - army.x;
      const dy = army.targetY - army.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 20) {
        const moveSpeed = army.speed * this.speed * 0.5;
        army.x += (dx / dist) * moveSpeed;
        army.y += (dy / dist) * moveSpeed;
      } else {
        army.targetX = null;
        army.targetY = null;
      }
      
      // Update marble positions around army center
      for (let i = 0; i < army.marbles.length; i++) {
        const marble = army.marbles[i];
        
        // Formation offset
        const angle = (i / army.marbles.length) * Math.PI * 2;
        const formation = 25 + (army.marbles.length / 10);
        marble.x = army.x + Math.cos(angle) * formation + (Math.random() - 0.5) * 10;
        marble.y = army.y + Math.sin(angle) * formation + (Math.random() - 0.5) * 10;
      }
    }
    
    // Check army-town interactions
    for (let army of this.armies) {
      if (army.marbles.length === 0) continue;
      
      for (let town of this.towns) {
        const dx = town.x - army.x;
        const dy = town.y - army.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 50) {
          // Army reached town
          if (town.owner === army.kingdomId) {
            // Reinforce and heal
            const reinforcements = Math.min(3, 50 - army.marbles.length);
            for (let j = 0; j < reinforcements; j++) {
              army.marbles.push(this.createMarble(army.kingdomId, 0));
            }
            town.garrison += reinforcements;
          } else {
            // Battle!
            this.battleTown(army, town);
          }
        }
      }
    }
    
    // Check army-army interactions
    for (let i = 0; i < this.armies.length; i++) {
      for (let j = i + 1; j < this.armies.length; j++) {
        const a1 = this.armies[i];
        const a2 = this.armies[j];
        
        if (a1.marbles.length === 0 || a2.marbles.length === 0) continue;
        if (a1.kingdomId === a2.kingdomId) continue;
        
        const dx = a2.x - a1.x;
        const dy = a2.y - a1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 60) {
          this.armyBattle(a1, a2);
        }
      }
    }
    
    // Town production
    if (this.turn % 30 === 0) {
      for (let town of this.towns) {
        if (town.owner >= 0) {
          town.garrison += town.productionRate;
          const kingdom = this.kingdoms[town.owner];
          kingdom.totalFighters += town.productionRate;
        }
      }
    }
    
    // Random power-ups every 100 turns
    if (this.turn > 0 && this.turn % 100 === 0) {
      for (let kingdom of this.kingdoms) {
        if (kingdom.alive && this.armies.some(a => a.kingdomId === kingdom.id && a.marbles.length > 0)) {
          this.grantRandomUpgrade(kingdom.id);
        }
      }
    }
    
    // Remove empty armies
    this.armies = this.armies.filter(a => a.marbles.length > 0);
    
    // Check for defeated kingdoms
    for (let kingdom of this.kingdoms) {
      if (!kingdom.alive) continue;
      
      const hasArmies = this.armies.some(a => a.kingdomId === kingdom.id);
      const hasTowns = this.towns.some(t => t.owner === kingdom.id);
      
      if (!hasArmies && !hasTowns) {
        kingdom.alive = false;
        this.addEvent(`Kingdom ${kingdom.id + 1} has been defeated!`, 'defeat');
      }
    }
    
    this.turn++;
  }
  
  battleTown(army, town) {
    const armyStrength = army.marbles.length;
    const townStrength = town.garrison;
    
    const totalStrength = armyStrength + townStrength;
    const armyWinChance = armyStrength / totalStrength;
    
    if (Math.random() < armyWinChance) {
      // Army wins
      const losses = Math.ceil(armyStrength * 0.3);
      army.marbles = army.marbles.slice(losses);
      
      const oldOwner = town.owner;
      town.owner = army.kingdomId;
      town.garrison = Math.max(1, Math.ceil(army.marbles.length / 2));
      
      const oldKingdom = oldOwner >= 0 ? this.kingdoms[oldOwner] : null;
      const newKingdom = this.kingdoms[army.kingdomId];
      
      this.addEvent(
        `${newKingdom.name} captured town!`,
        'capture'
      );
      
      // Grant power-up for capturing town
      if (this.turn % 5 === 0) {
        this.grantRandomUpgrade(army.kingdomId);
      }
    } else {
      // Town wins
      const losses = Math.ceil(townStrength * 0.2);
      town.garrison -= losses;
      army.marbles = [];
      
      this.addEvent(
        `Town defeated attacking army!`,
        'battle'
      );
    }
  }
  
  armyBattle(a1, a2) {
    const totalStrength = a1.marbles.length + a2.marbles.length;
    const a1WinChance = a1.marbles.length / totalStrength;
    
    const battleSize = Math.min(a1.marbles.length, a2.marbles.length);
    const a1Losses = Math.floor(battleSize * (1 - a1WinChance) * 0.6);
    const a2Losses = Math.floor(battleSize * a1WinChance * 0.6);
    
    a1.marbles = a1.marbles.slice(a1Losses);
    a2.marbles = a2.marbles.slice(a2Losses);
    
    const winner = a1.marbles.length > a2.marbles.length ? a1 : a2;
    const loser = winner === a1 ? a2 : a1;
    
    this.addEvent(
      `Battle: ${this.kingdoms[winner.kingdomId].name} vs ${this.kingdoms[loser.kingdomId].name}!`,
      'battle'
    );
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
    // Clear canvas with gradient
    const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
    gradient.addColorStop(0, '#1a472a');
    gradient.addColorStop(1, '#2d5a3d');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Apply transformations
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
    
    // Draw armies
    for (let army of this.armies) {
      this.drawArmy(army);
    }
    
    this.ctx.restore();
    
    // Draw UI
    this.drawUI();
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
  
  drawTown(town) {
    const kingdom = town.owner >= 0 ? this.kingdoms[town.owner] : null;
    const color = kingdom ? kingdom.color : '#888888';
    
    // Town base
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(town.x, town.y, 18, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Border
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // Garrison indicator
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(town.garrison, town.x, town.y);
  }
  
  drawArmy(army) {
    const kingdom = this.kingdoms[army.kingdomId];
    
    // Draw each marble in formation
    for (let marble of army.marbles) {
      this.ctx.fillStyle = kingdom.color;
      this.ctx.globalAlpha = 0.85;
      this.ctx.beginPath();
      this.ctx.arc(marble.x, marble.y, marble.radius, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Shine
      const shineGrad = this.ctx.createRadialGradient(
        marble.x - marble.radius / 3, marble.y - marble.radius / 3, 0,
        marble.x, marble.y, marble.radius
      );
      shineGrad.addColorStop(0, 'rgba(255,255,255,0.4)');
      shineGrad.addColorStop(1, 'rgba(255,255,255,0)');
      this.ctx.fillStyle = shineGrad;
      this.ctx.fill();
      
      this.ctx.globalAlpha = 1;
    }
  }
  
  drawUI() {
    // Turn counter and stats
    this.ctx.save();
    this.ctx.globalAlpha = 0.9;
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(10, 10, 200, 80);
    
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Turn: ${this.turn}`, 20, 30);
    this.ctx.font = '12px Arial';
    this.ctx.fillText(`Armies: ${this.armies.length}`, 20, 48);
    this.ctx.fillText(`Marbles: ${this.armies.reduce((sum, a) => sum + a.marbles.length, 0)}`, 20, 63);
    this.ctx.fillText(`Towns: ${this.towns.length}`, 20, 78);
    
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
      const numMarbles = this.armies.reduce((sum, a) => a.kingdomId === kingdom.id ? sum + a.marbles.length : sum, 0);
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
      div.textContent = `[${event.time}] ${event.text}`;
      log.appendChild(div);
    }
  }
  
  animate() {
    this.update();
    this.draw();
    
    // Update UI periodically
    if (this.turn % 10 === 0) {
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
