import { serverData } from "./serverData.js";

(function () {
            const canvas = document.getElementById('backgroundCanvas');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const outlineColor = '#525252';
            const outlineWidth = 5.5;
            const mathPI = Math.PI;
            const mathPI2 = mathPI * 2;
            const backgroundObjects = [];
            const treeScales = [150, 160, 165, 175];
            const windmillVariants = [
                { name: 'windmill', scale: 1 },
                { name: 'faster windmill', scale: 1.05 },
                { name: 'power mill', scale: 1.12 }
            ];
            const spikeVariants = [
                { name: 'spikes', points: 5, fill: '#939393', scale: 49 },
                { name: 'greater spikes', points: 6, fill: '#939393', scale: 52 },
                { name: 'poison spikes', points: 6, fill: '#7b935d', scale: 52 },
                { name: 'spinning spikes', points: 6, fill: '#939393', scale: 52 }
            ];
            const placementPadding = 25;

            let viewWidth = 0;
            let viewHeight = 0;
            let pixelRatio = window.devicePixelRatio || 1;

            const rand = (min, max) => Math.random() * (max - min) + min;
            const randInt = (min, max) => Math.floor(rand(min, max + 1));

            function resize() {
                pixelRatio = window.devicePixelRatio || 1;
                viewWidth = window.innerWidth;
                viewHeight = window.innerHeight;
                canvas.width = viewWidth * pixelRatio;
                canvas.height = viewHeight * pixelRatio;
                canvas.style.width = viewWidth + 'px';
                canvas.style.height = viewHeight + 'px';
                ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                seedObjects();
            }

            function seedObjects() {
                backgroundObjects.length = 0;
                const density = Math.max(viewWidth, viewHeight);
                const targetWindmills = Math.max(16, Math.floor(viewWidth / 85));
                const targetTrees = Math.max(14, Math.floor(density / 120));
                const targetSpikes = Math.max(16, Math.floor(viewWidth / 95));

                placeObjects('windmill', targetWindmills);
                placeObjects('tree', targetTrees);
                placeObjects('spike', targetSpikes);
            }

            function placeObjects(type, count) {
                let placed = 0;
                let attempts = 0;
                const maxAttempts = count * 20;
                while (placed < count && attempts < maxAttempts) {
                    const obj = createObject(type);
                    attempts++;
                    if (!isOverlapping(obj)) {
                        backgroundObjects.push(obj);
                        placed++;
                    }
                }
            }

            function createObject(type) {
                const base = {
                    type,
                    x: rand(-viewWidth * 0.1, viewWidth * 1.1),
                    y: rand(-viewHeight * 0.2, viewHeight * 1.2),
                    rotation: rand(0, mathPI2),
                    driftX: 0,
                    driftY: 0,
                    rotSpeed: 0,
                    wrap: false
                };
                if (type === 'windmill') {
                    const variant = windmillVariants[randInt(0, windmillVariants.length - 1)];
                    return {
                        ...base,
                        variant,
                        scale: rand(26, 40) * variant.scale,
                        rotSpeed: 0
                    };
                }
                if (type === 'tree') {
                    return {
                        ...base,
                        scale: treeScales[randInt(0, treeScales.length - 1)],
                        rotation: rand(0, mathPI2)
                    };
                }
                const variant = spikeVariants[randInt(0, spikeVariants.length - 1)];
                return {
                    ...base,
                    type: 'spike',
                    variant,
                    scale: variant.scale,
                    driftX: 0,
                    driftY: 0,
                    rotSpeed: 0,
                    wrap: false
                };
            }

            function isOverlapping(candidate) {
                const radius = (candidate.scale || 40) + placementPadding;
                for (let i = 0; i < backgroundObjects.length; i++) {
                    const obj = backgroundObjects[i];
                    const otherRadius = (obj.scale || 40) + placementPadding;
                    const dx = candidate.x - obj.x;
                    const dy = candidate.y - obj.y;
                    if ((dx * dx + dy * dy) < Math.pow(radius + otherRadius, 2)) {
                        return true;
                    }
                }
                return false;
            }

            function drawScene() {
                ctx.clearRect(0, 0, viewWidth, viewHeight);
                drawGround();
                backgroundObjects
                    .slice()
                    .sort((a, b) => a.y - b.y)
                    .forEach(drawObject);
                requestAnimationFrame(drawScene);
            }

            function drawGround() {
                const gradient = ctx.createLinearGradient(0, 0, 0, viewHeight);
                gradient.addColorStop(0, '#29420f');
                gradient.addColorStop(1, '#0d1d05');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, viewWidth, viewHeight);

                drawGrid();
            }

            function drawGrid() {
                const spacing = 140;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
                for (let x = -spacing; x < viewWidth + spacing; x += spacing) {
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, viewHeight);
                }
                for (let y = -spacing; y < viewHeight + spacing; y += spacing) {
                    ctx.moveTo(0, y);
                    ctx.lineTo(viewWidth, y);
                }
                ctx.stroke();

                ctx.beginPath();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
                for (let x = -spacing; x < viewWidth + spacing; x += spacing) {
                    ctx.moveTo(x - spacing, 0);
                    ctx.lineTo(x + spacing, viewHeight);
                }
                for (let x = -spacing; x < viewWidth + spacing; x += spacing) {
                    ctx.moveTo(x + spacing, 0);
                    ctx.lineTo(x - spacing, viewHeight);
                }
                ctx.stroke();
            }

            function drawObject(obj) {
                ctx.save();
                ctx.translate(obj.x, obj.y);
                ctx.rotate(obj.rotation);
                ctx.lineWidth = outlineWidth;
                ctx.strokeStyle = outlineColor;
                if (obj.type === 'windmill') {
                    drawWindmill(obj);
                } else if (obj.type === 'spike') {
                    drawSpikes(obj);
                } else if (obj.type === 'tree') {
                    drawTree(obj);
                }
                ctx.restore();
            }

            function drawWindmill(obj) {
                ctx.fillStyle = '#a5974c';
                renderCircle(0, 0, obj.scale);
                ctx.fillStyle = '#c9b758';
                renderRectCircle(0, 0, obj.scale * 1.5, 29, 4);
                ctx.fillStyle = '#a5974c';
                renderCircle(0, 0, obj.scale * 0.5);
            }

            function drawSpikes(obj) {
                ctx.fillStyle = obj.variant.fill;
                const inner = obj.scale * 0.6;
                renderStar(ctx, obj.variant.points, obj.scale, inner);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#a5974c';
                renderCircle(0, 0, inner);
                ctx.fillStyle = '#c9b758';
                renderCircle(0, 0, inner / 2, ctx, true);
            }

            function drawTree(obj) {
                for (let i = 0; i < 2; i++) {
                    const tmpScale = obj.scale * (i === 0 ? 1 : 0.5);
                    renderStar(ctx, 7, tmpScale, tmpScale * 0.7);
                    ctx.fillStyle = i === 0 ? '#9ebf57' : '#b4db62';
                    ctx.fill();
                    if (i === 0) ctx.stroke();
                }
            }

            function renderCircle(x, y, scale, tmpContext = ctx, dontStroke, dontFill) {
                tmpContext.beginPath();
                tmpContext.arc(x, y, scale, 0, mathPI2);
                if (!dontFill) tmpContext.fill();
                if (!dontStroke) tmpContext.stroke();
            }

            function renderRect(x, y, w, h, tmpContext = ctx, stroke) {
                tmpContext.fillRect(x - (w / 2), y - (h / 2), w, h);
                if (!stroke) {
                    tmpContext.strokeRect(x - (w / 2), y - (h / 2), w, h);
                }
            }

            function renderRectCircle(x, y, s, sw, seg, tmpContext = ctx, stroke) {
                tmpContext.save();
                tmpContext.translate(x, y);
                seg = Math.ceil(seg / 2);
                for (let i = 0; i < seg; i++) {
                    renderRect(0, 0, s * 2, sw, tmpContext, stroke);
                    tmpContext.rotate(Math.PI / seg);
                }
                tmpContext.restore();
            }

            function renderStar(ctxt, spikes, outer, inner) {
                let rot = Math.PI / 2 * 3;
                let step = Math.PI / spikes;
                ctxt.beginPath();
                ctxt.moveTo(0, -outer);
                for (let i = 0; i < spikes; i++) {
                    ctxt.lineTo(Math.cos(rot) * outer, Math.sin(rot) * outer);
                    rot += step;
                    ctxt.lineTo(Math.cos(rot) * inner, Math.sin(rot) * inner);
                    rot += step;
                }
                ctxt.closePath();
            }

            resize();
            drawScene();
            window.addEventListener('resize', resize);
        })();

const STANDARD_SERVER_ICON = "&#xE55B;";
const BUTTON_CONFIG = {
    normal: { className: "normalButton", icon: "&#xE838;", text: "Join Normal" },
    sandbox: { className: "sandboxButton", icon: "&#xE8B9;", text: "Join Sandbox" },
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeServerUI);
} else {
    initializeServerUI();
}

function initializeServerUI() {
    renderServers();
    initGameModeTabs();
    initQuickPlayCard();
    initNavigationLinks();
    initActiveSectionWatcher();
    initScrollIndicator();
}

function renderServers() {
    const ogGrid = document.getElementById('ogServers');
    const customGrid = document.getElementById('customServers');
    if (!ogGrid || !customGrid) {
        return;
    }

    const { og = [], custom = [], special = [] } = serverData || {};

    const quickPlayCard = ogGrid.querySelector('.quickPlayCard');
    if (quickPlayCard) {
        quickPlayCard.remove();
    }

    ogGrid.innerHTML = '';
    og.forEach(server => {
        ogGrid.appendChild(buildStandardServerCard(server, 'og'));
    });

    if (quickPlayCard) {
        ogGrid.appendChild(quickPlayCard);
    }

    customGrid.innerHTML = '';
    custom.forEach(server => {
        customGrid.appendChild(buildStandardServerCard(server, 'custom'));
    });
    special.forEach(server => {
        customGrid.appendChild(buildSpecialServerCard(server));
    });
}

function buildStandardServerCard(server, category) {
    const card = document.createElement('div');
    card.className = 'serverCard';
    card.dataset.region = server.id;
    card.dataset.category = category;

    card.appendChild(buildServerCardTop(STANDARD_SERVER_ICON, server));
    card.appendChild(buildStatsSection(server));
    card.appendChild(buildStandardButtons(server, category));

    return card;
}

function buildSpecialServerCard(server) {
    const card = document.createElement('div');
    card.className = `serverCard specialServer ${server.cardClass}`;
    card.dataset.type = server.type;

    const badge = document.createElement('div');
    badge.className = `specialBadge ${server.badge.className}`;
    badge.appendChild(createIconElement(server.badge.icon));
    const badgeText = document.createElement('span');
    badgeText.textContent = server.badge.text;
    badge.appendChild(badgeText);
    card.appendChild(badge);

    card.appendChild(buildServerCardTop(server.icon, server));
    card.appendChild(buildStatsSection(server));

    const buttons = document.createElement('div');
    buttons.className = 'serverButtons singleButton';
    buttons.appendChild(createSpecialButton(server));
    card.appendChild(buttons);

    return card;
}

function buildServerCardTop(iconCode, server) {
    const top = document.createElement('div');
    top.className = 'serverCardTop';

    top.appendChild(createIconElement(iconCode, 'serverCardIcon'));

    const info = document.createElement('div');
    info.className = 'serverCardInfo';

    const name = document.createElement('div');
    name.className = 'serverCardName';
    name.textContent = server.name;

    const region = document.createElement('div');
    region.className = 'serverCardRegion';
    region.textContent = server.region;

    info.append(name, region);
    top.append(info);

    return top;
}

function buildStatsSection(server) {
    const stats = document.createElement('div');
    stats.className = 'serverCardStats';
    stats.appendChild(createStatItem('Ping', server.ping.value, server.ping.quality));
    stats.appendChild(createStatItem('Players', server.players));
    stats.appendChild(createStatItem('Status', server.status.label, server.status.state));
    return stats;
}

function createStatItem(label, value, valueClass) {
    const stat = document.createElement('div');
    stat.className = 'statItem';

    const statLabel = document.createElement('span');
    statLabel.className = 'statLabel';
    statLabel.textContent = label;

    const statValue = document.createElement('span');
    statValue.className = 'statValue';
    if (valueClass) {
        statValue.classList.add(valueClass);
    }
    statValue.textContent = value;

    stat.append(statLabel, statValue);
    return stat;
}

function buildStandardButtons(server, category) {
    const buttons = document.createElement('div');
    buttons.className = 'serverButtons';
    buttons.appendChild(createServerButton('normal', () => joinServer(server, 'normal', category)));
    buttons.appendChild(createServerButton('sandbox', () => joinServer(server, 'sandbox', category)));
    return buttons;
}

function createServerButton(type, handler) {
    const config = BUTTON_CONFIG[type];
    const button = document.createElement('div');
    button.className = `serverCardButton ${config.className}`;
    button.appendChild(createIconElement(config.icon));
    const label = document.createElement('span');
    label.textContent = config.text;
    button.appendChild(label);
    button.addEventListener('click', handler);
    return button;
}

function createSpecialButton(server) {
    const button = document.createElement('div');
    button.className = `serverCardButton ${server.button.className}`;
    if (server.button.disabled) {
        button.classList.add('disabled');
    }
    button.appendChild(createIconElement(server.button.icon));
    const label = document.createElement('span');
    label.textContent = server.button.text;
    button.appendChild(label);

    if (server.button.action === 'private') {
        button.addEventListener('click', () => joinPrivateServer(server));
    } else {
        button.addEventListener('click', () => joinSpecialServer(server));
    }

    return button;
}

function createIconElement(iconCode, extraClass = '') {
    const icon = document.createElement('i');
    icon.className = `material-icons${extraClass ? ` ${extraClass}` : ''}`;
    icon.innerHTML = iconCode;
    return icon;
}

function switchGameMode(mode) {
    const ogServers = document.getElementById('ogServers');
    const customServers = document.getElementById('customServers');
    if (!ogServers || !customServers) {
        return;
    }

    const showOg = mode === 'og';
    ogServers.style.display = showOg ? 'grid' : 'none';
    customServers.style.display = showOg ? 'none' : 'grid';

    document.querySelectorAll('.gameModeTab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.mode === mode);
    });
}

function initGameModeTabs() {
    switchGameMode('og');

    const tabsContainer = document.querySelector('.gameModeTabs');
    if (!tabsContainer) {
        return;
    }

    tabsContainer.addEventListener('click', event => {
        const tab = event.target.closest('.gameModeTab');
        if (!tab) {
            return;
        }
        const mode = tab.dataset.mode || 'og';
        switchGameMode(mode);
    });
}

function joinServer(server, mode, category) {
    const gameMode = category === 'custom' ? 'custom' : 'og';
    alert(`Connecting to ${server.name} server...
Game Mode: ${gameMode.toUpperCase()}
Server Type: ${mode.charAt(0).toUpperCase() + mode.slice(1)}

This will redirect to the game page.`);
    window.location.href = '../index.html';
}

function joinPrivateServer(server) {
    const password = prompt(`Enter server password for ${server.name}:`);
    if (password) {
        alert(`Verifying password...
Connecting to ${server.name}

This will redirect to the game page.`);
        window.location.href = '../index.html';
    }
}

function joinSpecialServer(server) {
    const typeNames = {
        beta: 'Beta Test',
        event: 'Event',
        tournament: 'Tournament'
    };
    const typeName = typeNames[server.type] || server.name;
    alert(`Connecting to ${typeName} Server...

This will redirect to the game page.`);
    window.location.href = '../index.html';
}

function quickPlay(gameMode) {
    alert(`Quick Play - ${gameMode.toUpperCase()} Mode
Finding the best server for you...

This will redirect to the game page.`);
    window.location.href = '../index.html';
}

function initQuickPlayCard() {
    const quickPlayCard = document.querySelector('.quickPlayCard');
    if (!quickPlayCard) {
        return;
    }
    quickPlayCard.addEventListener('click', () => {
        const gameMode = quickPlayCard.dataset.gamemode || 'og';
        quickPlay(gameMode);
    });
}

function initNavigationLinks() {
    document.querySelectorAll('.navLink').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const target = document.querySelector(targetId);

            document.querySelectorAll('.navLink').forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            if (target) {
                const offset = targetId === '#hero' ? 0 : 80;
                const targetPosition = target.offsetTop - offset;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

function initActiveSectionWatcher() {
    window.addEventListener('scroll', () => {
        const sections = ['hero', 'servers', 'resources'];
        let current = 'hero';

        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                const sectionTop = section.offsetTop - 100;
                if (window.scrollY >= sectionTop) {
                    current = sectionId;
                }
            }
        });

        document.querySelectorAll('.navLink').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
}

function initScrollIndicator() {
    const scrollIndicator = document.querySelector('.scrollIndicator');
    if (!scrollIndicator) {
        return;
    }
    window.addEventListener('scroll', () => {
        scrollIndicator.style.opacity = window.scrollY > 100 ? '0' : '1';
    });
}
