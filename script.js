function showSection(sectionId) {
    const sections = document.querySelectorAll('.module-section, .main-panel');
    const subTitle = document.getElementById('sub-title');
    
    sections.forEach(sec => {
        sec.classList.add('hidden');
        sec.style.opacity = "0";
    });

    let target = (sectionId === 'home') ? document.getElementById('entregas') : document.getElementById(sectionId);
    
    if (subTitle) {
        const titles = {
            'home': "Panel de Control de Entregas",
            'logistica-transporte': "Módulo 01: Logística",
            'ra': "Módulo 02: Realidad Aumentada",
            'ia-vision': "Módulo 03: Inteligencia Artificial"
        };
        subTitle.innerText = titles[sectionId] || titles['home'];
    }

    if (target) {
        target.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        const tl = anime.timeline({ 
            easing: 'easeOutElastic(1, .6)', 
            duration: 1100 
        });

        tl.add({ 
            targets: target, 
            opacity: [0, 1], 
            translateY: [30, 0], 
            duration: 500, 
            easing: 'easeOutQuad' 
        });

        tl.add({
            targets: target.querySelectorAll('.anime-item'),
            opacity: [0, 1],
            scale: [0.85, 1],
            translateY: [40, 0],
            backgroundColor: [
                { value: '#3498db', duration: 100 }, 
                { value: 'rgba(255,255,255,0)', duration: 800 }
            ],
            delay: anime.stagger(130),
            duration: 1300
        }, '-=600');
    }
}
window.onload = () => showSection('home');

// ==========================================
// VARIABLES GLOBALES de teachablemachine
// ==========================================
let model, webcam, labelContainer, maxPredictions;
let poseCtx;
let recognizer;

function stopAll() {
    if (webcam) {
        webcam.stop();
        const canvasContainer = document.getElementById("webcam-container");
        const poseContainer = document.getElementById("pose-canvas-container");
        if (canvasContainer) canvasContainer.innerHTML = "";
        if (poseContainer) poseContainer.innerHTML = "";
    }
    if (recognizer && recognizer.isListening()) {
        recognizer.stopListening();
        document.getElementById("audio-label-container").innerText = "Detección detenida.";
    }
    console.log("Sistemas detenidos");
}

async function initImage() {
    stopAll();
    const folder = "./tm-my-image-model/";
    model = await tmImage.load(folder + "model.json", folder + "metadata.json");
    maxPredictions = model.getTotalClasses();
    webcam = new tmImage.Webcam(300, 300, true);
    await webcam.setup();
    await webcam.play();
    document.getElementById("webcam-container").appendChild(webcam.canvas);
    labelContainer = document.getElementById("label-container");
    window.requestAnimationFrame(loopImage);
}

async function loopImage() {
    if (webcam && webcam.canvas) {
        webcam.update();
        await predictImage();
        window.requestAnimationFrame(loopImage);
    }
}

async function predictImage() {
    const prediction = await model.predict(webcam.canvas);
    let best = prediction.reduce((prev, curr) => (prev.probability > curr.probability) ? prev : curr);
    labelContainer.innerText = `Imagen: ${best.className} (${(best.probability * 100).toFixed(0)}%)`;
}

async function initAudio() {
    stopAll();
    const folder = "./tm-my-audio-model/";
    const audioLabel = document.getElementById("audio-label-container");
    audioLabel.innerText = "Cargando audio...";
    audioLabel.style.color = "white";
    try {
        const modelURL = folder + "model-audio.json";
        const metadataURL = folder + "metadata-audio.json";
        recognizer = speechCommands.create("BROWSER_FFT", undefined, modelURL, metadataURL);
        await recognizer.ensureModelLoaded();
        audioLabel.innerText = "¡Escuchando!";
        audioLabel.style.color = "#3498db";
        recognizer.listen(result => {
            const words = recognizer.wordLabels();
            const scores = result.scores;
            const highIndex = scores.indexOf(Math.max(...scores));
            if (scores[highIndex] > 0.75) {
                audioLabel.innerText = `Oído: ${words[highIndex]} (${(scores[highIndex] * 100).toFixed(0)}%)`;
            }
        }, { includeSpectrogram: true, probabilityThreshold: 0.75, overlapFactor: 0.5 });
    } catch (error) {
        console.error("Error detallado:", error);
        audioLabel.innerText = "Error: No se encuentran los archivos -audio.json";
        audioLabel.style.color = "#ff4d4d";
    }
}

// ============================================================
//  ACADEMIC NEXUS AI
// ============================================================
const NexusAI = (() => {
    let apiKey = '';
    let history = [];
    let msgCount = 0;

    const SYSTEM_PROMPT = `Eres "Academic Nexus AI", un Orquestador de Productividad Académica embebido en el dashboard de un estudiante de Ingeniería/Tecnología en la Universidad de Manizales, Colombia.
El portafolio tiene tres módulos IoT: Logística y Transporte, Realidad Aumentada, IA & Visión Artificial.

Reglas de operación:
- Tono: profesional, industrial, directo. Sin lenguaje condescendiente.
- Plan del Día: usa tabla Markdown con columnas Hora | Bloque | Tarea | Prioridad.
- Talleres técnicos (Python, Kotlin, IoT, IA, SEO): asigna bloques "Deep Work" de mínimo 2 horas.
- Resalta términos técnicos en **negrita**.
- Usa listas cuando sea más claro que prosa.
- Salidas en Markdown estándar, listas para renderizar en HTML.
- Máximo 400 palabras salvo que se pida más.
- Slots de calendario en formato: [HH:MM – HH:MM] Actividad.`;

    const $ = id => document.getElementById(id);

    function saveKey() {
        const val = $('nx-api-key').value.trim();
        if (!val.startsWith('sk-ant-')) {
            $('nx-api-key').style.borderColor = '#ff4560';
            $('nx-api-key').placeholder = '⚠ Debe comenzar con sk-ant-';
            setTimeout(() => {
                $('nx-api-key').style.borderColor = '';
                $('nx-api-key').placeholder = 'sk-ant-api… (solo en memoria del browser)';
            }, 2500);
            return;
        }
        apiKey = val;
        $('nx-api-key').value = '';
        $('nx-api-key').style.borderColor = '#00ff88';
        $('nx-api-key').placeholder = '✓ API Key activa en memoria';
        setTimeout(() => { $('nx-api-key').style.borderColor = ''; }, 2000);
    }

    function clearChat() {
        history = [];
        msgCount = 0;
        $('nx-messages').innerHTML = '';
        $('nx-msg-count').textContent = '0';
    }

    function md2html(text) {
        return text
            .replace(/\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)*)/g, (_, header, rows) => {
                const ths = header.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
                const trs = rows.trim().split('\n').map(row => {
                    const tds = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
                    return `<tr>${tds}</tr>`;
                }).join('');
                return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
            })
            .replace(/^#{1,4} (.+)$/gm, '<h4>$1</h4>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/^[•\-\*] (.+)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
            .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
    }

    function appendMsg(role, content, isThinking = false) {
        const container = $('nx-messages');
        const div = document.createElement('div');
        div.className = `nx-msg ${role}`;
        div.innerHTML = `
            <div class="nx-msg-avatar"><i class="${role === 'user' ? 'fas fa-user' : 'fas fa-robot'}"></i></div>
            <div class="nx-msg-body">
                <div class="nx-msg-role">${role === 'user' ? 'TÚ' : 'NEXUS AI'}</div>
                <div class="nx-msg-content" ${isThinking ? 'id="nx-thinking-bubble"' : ''}>
                    ${isThinking
                        ? '<div class="nx-thinking"><span></span><span></span><span></span></div>'
                        : `<p>${md2html(content)}</p>`}
                </div>
            </div>`;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
        return div;
    }

    function handleKey(e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    }

    function quickSend(text) {
        $('nx-input').value = text;
        send();
    }

    async function send() {
        const input = $('nx-input');
        const userText = input.value.trim();
        if (!userText) return;

        if (!apiKey) {
            appendMsg('ai', '⚠ **Sin API Key.** Ingresa tu Anthropic API Key arriba para activar el orquestador.');
            return;
        }

        appendMsg('user', userText);
        history.push({ role: 'user', content: userText });
        input.value = '';
        msgCount++;
        $('nx-msg-count').textContent = msgCount;

        const btn = $('nx-send-btn');
        btn.disabled = true;
        const thinkingEl = appendMsg('ai', '', true);

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 1000,
                    system: SYSTEM_PROMPT,
                    messages: history
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            const aiText = data.content.map(b => b.type === 'text' ? b.text : '').join('');

            thinkingEl.remove();
            appendMsg('ai', aiText);
            history.push({ role: 'assistant', content: aiText });
            msgCount++;
            $('nx-msg-count').textContent = msgCount;

        } catch (err) {
            thinkingEl.remove();
            appendMsg('ai', `❌ **Error:** ${err.message}`);
        } finally {
            btn.disabled = false;
            input.focus();
        }
    }

    return { saveKey, clearChat, send, handleKey, quickSend };
})();

// ============================================================
//  GHOSTMODE AI — separado de NexusAI
// ============================================================
const GhostMode = (() => {
    let apiKey = '';
    let history = [];

    const GHOST_SYSTEM = `Eres GhostMode AI, un asistente inteligente para estudiantes universitarios que analiza sus hábitos y predice su rendimiento académico.
Tu objetivo es detectar patrones de procrastinación, bajo rendimiento o desorganización, y advertir al estudiante antes de que falle en sus materias.
Debes:
- Analizar el comportamiento del estudiante (tiempo de estudio, tareas pendientes, constancia)
- Identificar riesgos como falta de estudio o exceso de carga académica
- Dar advertencias claras y directas sobre posibles consecuencias
- Motivar al estudiante a mejorar con recomendaciones prácticas
Tu personalidad debe ser:
- Directa y honesta
- Un poco seria y reflexiva
- Enfocada en el futuro del estudiante
- Como si fueras una voz que advierte lo que pasará si no cambia
Nunca des información falsa. Si no tienes suficiente información, pídele más datos al estudiante.
Responde de forma breve, clara y con impacto. Máximo 4 párrafos cortos.

Al INICIO de tu respuesta incluye una línea con el nivel de riesgo en este formato EXACTO (solo una vez):
RIESGO_NIVEL: LOW | RIESGO_NIVEL: MED | RIESGO_NIVEL: HIGH
Luego tu respuesta normal debajo.`;

    const $ = id => document.getElementById(id);

    function saveKey() {
        const val = $('ghost-api-key')?.value?.trim();
        if (!val) return;
        apiKey = val;
        const input = $('ghost-api-key');
        const bar = $('ghost-key-bar');
        if (input) {
            input.value = '';
            input.style.borderColor = '#00ff88';
            input.placeholder = '✓ API Key activa en memoria';
            setTimeout(() => { input.style.borderColor = ''; }, 2000);
        }
        if (bar) {
            setTimeout(() => { bar.style.opacity = '0.4'; }, 2000);
        }
        appendMsg('ai', 'API Key activada. Sistema listo. Cuéntame tu situación académica actual.');
    }

    function appendMsg(role, content, isThinking = false) {
        const container = $('ghost-messages');
        if (!container) return null;
        const div = document.createElement('div');
        div.className = `msg ${role}`;
        div.innerHTML = `
            <div class="msg-icon"><i class="fas fa-${role === 'user' ? 'user' : 'ghost'}"></i></div>
            <div class="msg-bubble">
                ${isThinking
                    ? '<div class="typing-indicator"><span></span><span></span><span></span></div>'
                    : content}
            </div>`;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
        return div;
    }

    function handleKey(e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    }

    function quickSend(text) {
        const input = $('ghost-input');
        if (input) input.value = text;
        send();
    }

    async function send() {
        const input = $('ghost-input');
        const text = input?.value?.trim();
        if (!text) return;

        if (!apiKey) {
            appendMsg('ai', '⚠ Ingresa tu API Key arriba y pulsa <strong>GUARDAR</strong> primero.');
            return;
        }

        appendMsg('user', text);
        history.push({ role: 'user', content: text });
        input.value = '';
        input.style.height = 'auto';

        const sendBtn = $('ghost-send-btn');
        if (sendBtn) sendBtn.disabled = true;

        const thinkingEl = appendMsg('ai', '', true);

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: GHOST_SYSTEM }] },
                    contents: history.map(m => ({
                        role: m.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: m.content }]
                    }))
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta.';

            // Extraer nivel de riesgo
            let riesgoNivel = 'low';
            let displayText = fullText;
            const riesgoMatch = fullText.match(/RIESGO_NIVEL:\s*(LOW|MED|HIGH)/i);
            if (riesgoMatch) {
                riesgoNivel = riesgoMatch[1].toLowerCase();
                displayText = fullText.replace(/RIESGO_NIVEL:\s*(LOW|MED|HIGH)\n?/i, '').trim();
            }

            // Actualizar badge
            const badge = $('ghost-risk-badge');
            if (badge) {
                badge.className = `ghost-risk-badge ${riesgoNivel}`;
                const labels = { low: 'RIESGO: BAJO', med: 'RIESGO: MEDIO', high: 'RIESGO: ALTO' };
                badge.textContent = labels[riesgoNivel] || 'RIESGO: —';
            }

            if (thinkingEl) {
                const isWarning = riesgoNivel === 'high' || riesgoNivel === 'med';
                thinkingEl.className = `msg ai${isWarning ? ' warning' : ''}`;
                thinkingEl.querySelector('.msg-bubble').innerHTML = displayText.replace(/\n/g, '<br>');
            }

            history.push({ role: 'assistant', content: fullText });

        } catch (err) {
            if (thinkingEl) thinkingEl.querySelector('.msg-bubble').innerHTML = `❌ <strong>Error:</strong> ${err.message}`;
        }

        if (sendBtn) sendBtn.disabled = false;
        const container = $('ghost-messages');
        if (container) container.scrollTop = container.scrollHeight;
    }

    return { saveKey, send, handleKey, quickSend };
})();

// Auto-resize textarea ghost
document.addEventListener('input', e => {
    if (e.target?.id === 'ghost-input') {
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    }
});
