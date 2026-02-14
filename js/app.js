// ========================================
// Data Loading
// ========================================

async function loadJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

// ========================================
// Club Yardages
// ========================================

let clubData = {};
let activeCategory = 'woods';

function renderClubCards(category) {
  const container = document.getElementById('club-cards');
  const clubs = clubData[category] || [];

  const hasFull = clubs.some(c => c.fullCarry !== null);

  container.innerHTML = clubs.map(club => {
    const hasFullData = club.fullCarry !== null;

    return `
      <div class="club-card">
        <div class="club-info">
          <div class="club-name">${club.club}</div>
        </div>
        <div class="club-distances">
          ${hasFull ? `
            <div class="distance-group">
              <div class="distance-group-label">Stock</div>
              <div class="distance-pair">
                <div class="distance">
                  <div class="distance-value">${club.stockCarry}</div>
                  <div class="distance-label">Carry</div>
                </div>
                <div class="distance">
                  <div class="distance-value">${club.stockTotal}</div>
                  <div class="distance-label">Total</div>
                </div>
              </div>
            </div>
            ${hasFullData ? `
              <div class="distance-divider"></div>
              <div class="distance-group">
                <div class="distance-group-label">Full</div>
                <div class="distance-pair">
                  <div class="distance">
                    <div class="distance-value">${club.fullCarry}</div>
                    <div class="distance-label">Carry</div>
                  </div>
                  <div class="distance">
                    <div class="distance-value">${club.fullTotal}</div>
                    <div class="distance-label">Total</div>
                  </div>
                </div>
              </div>
            ` : `
              <div class="distance-divider"></div>
              <div class="distance-group empty">
                <div class="distance-group-label">&nbsp;</div>
                <div class="distance-pair">
                  <div class="distance"><div class="distance-value">&mdash;</div><div class="distance-label">&nbsp;</div></div>
                  <div class="distance"><div class="distance-value">&mdash;</div><div class="distance-label">&nbsp;</div></div>
                </div>
              </div>
            `}
          ` : `
            <div class="distance">
              <div class="distance-value">${club.stockCarry}</div>
              <div class="distance-label">Carry</div>
            </div>
            <div class="distance">
              <div class="distance-value">${club.stockTotal}</div>
              <div class="distance-label">Total</div>
            </div>
          `}
        </div>
      </div>
    `;
  }).join('');
}

function initClubTabs() {
  const tabs = document.querySelectorAll('#club-tabs .tab');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeCategory = tab.dataset.category;
      renderClubCards(activeCategory);
    });
  });
}

// ========================================
// Putting Section
// ========================================

function renderBrysonTable(data) {
  const rows = data.rows.map(r => `
    <tr class="${r.original ? 'row-original' : 'row-interpolated'}">
      <td class="cell-steps">${r.steps}</td>
      <td>${r.feet}</td>
      <td>${r.pct1}</td>
      <td>${r.pct2}</td>
      <td>${r.pct3}</td>
      <td>${r.pct4}</td>
      <td>${r.pct5}</td>
      <td>${r.pct6}</td>
    </tr>
  `).join('');

  return `
    <div class="putting-card">
      <div class="putting-card-header">
        <h3>${data.title}</h3>
        <p>${data.description}</p>
      </div>
      <div class="table-scroll">
        <table class="putting-table bryson-table">
          <thead>
            <tr>
              ${data.columns.map(c => `<th>${c}</th>`).join('')}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderZBLChart(data) {
  const rows = data.rows.map(r => `
    <tr>
      <td>${r.clock}</td>
      <td>${r.angle}</td>
      <td>${r.sine}</td>
      <td class="cell-aim">${r.aim}</td>
    </tr>
  `).join('');

  return `
    <div class="putting-card">
      <div class="putting-card-header">
        <h3>${data.title}</h3>
        <p>${data.description}</p>
      </div>
      <table class="putting-table zbl-table">
        <thead>
          <tr>
            ${data.columns.map(c => `<th>${c}</th>`).join('')}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderGravityNote(data) {
  return `
    <div class="putting-card">
      <div class="putting-card-header">
        <h3>${data.title}</h3>
        <p>${data.description}</p>
      </div>
      <div class="gravity-note">
        <p>${data.note}</p>
      </div>
    </div>
  `;
}

function renderPutting(puttingData) {
  const container = document.getElementById('putting-grid');
  let html = '';

  if (puttingData.brysonTable) html += renderBrysonTable(puttingData.brysonTable);
  if (puttingData.zblChart) html += renderZBLChart(puttingData.zblChart);
  if (puttingData.gravityVector) html += renderGravityNote(puttingData.gravityVector);

  container.innerHTML = html;
}

// ========================================
// Accordion
// ========================================

function initAccordion() {
  const headers = document.querySelectorAll('.accordion-header');

  headers.forEach(header => {
    header.addEventListener('click', () => {
      const item = header.parentElement;
      const isOpen = item.classList.contains('open');

      document.querySelectorAll('.accordion-item').forEach(i => {
        i.classList.remove('open');
        i.querySelector('.accordion-header').setAttribute('aria-expanded', 'false');
      });

      if (!isOpen) {
        item.classList.add('open');
        header.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

// ========================================
// Sticky Nav - Active Section Highlighting
// ========================================

function initNavHighlighting() {
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.section');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(link => {
          link.classList.toggle('active', link.dataset.section === id);
        });
      }
    });
  }, {
    rootMargin: '-80px 0px -60% 0px',
    threshold: 0
  });

  sections.forEach(section => observer.observe(section));
}

// ========================================
// Init
// ========================================

async function init() {
  try {
    const [clubs, putting] = await Promise.all([
      loadJSON('data/clubs.json'),
      loadJSON('data/putting.json')
    ]);

    clubData = clubs;
    renderClubCards(activeCategory);
    initClubTabs();
    renderPutting(putting);
    initAccordion();
    initNavHighlighting();

  } catch (error) {
    console.error('Error loading data:', error);
    document.querySelector('.container').innerHTML = `
      <div style="text-align:center; padding:3rem 1rem; color:#999;">
        <p>Failed to load data. Make sure you're running a local server.</p>
        <p style="font-size:0.8rem; margin-top:0.5rem;">Try: <code>npx serve</code> in the project root</p>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', init);
