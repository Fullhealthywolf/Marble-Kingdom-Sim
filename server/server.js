const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Parse JSON requests
app.use(express.json());

// Physics engine simulation endpoints
app.post('/api/simulate', (req, res) => {
  const { marbles, timestep } = req.body;
  
  if (!marbles || !timestep) {
    return res.status(400).json({ error: 'Missing marbles or timestep' });
  }

  // Run physics simulation
  const simulatedMarbles = simulatePhysics(marbles, timestep);
  res.json({ marbles: simulatedMarbles });
});

app.post('/api/collide', (req, res) => {
  const { marble1, marble2 } = req.body;
  
  if (!marble1 || !marble2) {
    return res.status(400).json({ error: 'Missing marble data' });
  }

  const result = handleMarbleCollision(marble1, marble2);
  res.json(result);
});

// Main physics simulation function
function simulatePhysics(marbles, dt) {
  const gravity = 0.5;
  const friction = 0.98;
  const bounce = 0.7;
  
  return marbles.map(marble => {
    let m = { ...marble };
    
    // Apply gravity
    m.vy += gravity * dt;
    
    // Apply friction
    m.vx *= friction;
    m.vy *= friction;
    
    // Update position
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    
    // Boundary collisions
    const canvasWidth = 800;
    const canvasHeight = 600;
    
    if (m.x - m.radius < 0) {
      m.x = m.radius;
      m.vx *= -bounce;
    } else if (m.x + m.radius > canvasWidth) {
      m.x = canvasWidth - m.radius;
      m.vx *= -bounce;
    }
    
    if (m.y - m.radius < 0) {
      m.y = m.radius;
      m.vy *= -bounce;
    } else if (m.y + m.radius > canvasHeight) {
      m.y = canvasHeight - m.radius;
      m.vy *= -bounce;
    }
    
    return m;
  });
}

// Handle marble-to-marble collision
function handleMarbleCollision(m1, m2) {
  const dx = m2.x - m1.x;
  const dy = m2.y - m1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = m1.radius + m2.radius;
  
  if (dist < minDist) {
    // Normalize collision vector
    const nx = dx / dist;
    const ny = dy / dist;
    
    // Relative velocity
    const dvx = m2.vx - m1.vx;
    const dvy = m2.vy - m1.vy;
    
    // Relative velocity in collision normal direction
    const dvn = dvx * nx + dvy * ny;
    
    // Don't collide if velocities are separating
    if (dvn >= 0) return { m1, m2 };
    
    // Collision impulse (assuming equal mass)
    const impulse = -dvn / 2;
    
    const result = {
      m1: {
        ...m1,
        vx: m1.vx + impulse * nx,
        vy: m1.vy + impulse * ny
      },
      m2: {
        ...m2,
        vx: m2.vx - impulse * nx,
        vy: m2.vy - impulse * ny
      }
    };
    
    // Separate overlapping marbles
    const overlap = (minDist - dist) / 2;
    result.m1.x -= overlap * nx;
    result.m1.y -= overlap * ny;
    result.m2.x += overlap * nx;
    result.m2.y += overlap * ny;
    
    return result;
  }
  
  return { m1, m2 };
}

const server = app.listen(PORT, () => {
  console.log(`Marble Kingdom Sim server running on http://localhost:${PORT}`);
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Trying port ${PORT + 1}...`);
    const newPort = PORT + 1;
    app.listen(newPort, () => {
      console.log(`Marble Kingdom Sim server running on http://localhost:${newPort}`);
    });
  } else {
    throw err;
  }
});
