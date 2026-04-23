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

/// ==========================================
// VARIABLES GLOBALES de teachablemachine
// ==========================================
let model, webcam, labelContainer, maxPredictions;
let poseCtx;
let recognizer; // Variable para el audio

// --- FUNCIÓN GENÉRICA PARA DETENER TODO ---
function stopAll() {
    // Detener Cámara (Imagen o Pose)
    if (webcam) {
        webcam.stop();
        const canvasContainer = document.getElementById("webcam-container");
        const poseContainer = document.getElementById("pose-canvas-container");
        if (canvasContainer) canvasContainer.innerHTML = "";
        if (poseContainer) poseContainer.innerHTML = "";
    }
    // Detener Audio
    if (recognizer && recognizer.isListening()) {
        recognizer.stopListening();
        document.getElementById("audio-label-container").innerText = "Detección detenida.";
    }
    
    console.log("Sistemas detenidos");
}

// --- IMAGEN ---
async function initImage() {
    stopAll(); // Detenemos cualquier proceso previo
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

// --- AUDIO ---
async function initAudio() {
    stopAll(); // Detiene cámara o pose si están activos
    const folder = "./tm-my-audio-model/";
    const audioLabel = document.getElementById("audio-label-container");
    
    audioLabel.innerText = "Cargando audio...";
    audioLabel.style.color = "white"; 

    try {
        // Rutas con tus nombres personalizados
        const modelURL = folder + "model-audio.json";
        const metadataURL = folder + "metadata-audio.json";

        // IMPORTANTE: Usamos speechCommands, no tmImage
        recognizer = speechCommands.create(
            "BROWSER_FFT", 
            undefined, 
            modelURL, 
            metadataURL
        );

        // Esperamos a que cargue el modelo
        await recognizer.ensureModelLoaded();
        
        audioLabel.innerText = "¡Escuchando!";
        audioLabel.style.color = "#3498db";

        recognizer.listen(result => {
            const words = recognizer.wordLabels(); // Nombres de tus sonidos
            const scores = result.scores;
            
            // Buscamos el índice con la probabilidad más alta
            const highIndex = scores.indexOf(Math.max(...scores));
            
            if (scores[highIndex] > 0.75) {
                audioLabel.innerText = `Oído: ${words[highIndex]} (${(scores[highIndex] * 100).toFixed(0)}%)`;
            }
        }, {
            includeSpectrogram: true,
            probabilityThreshold: 0.75,
            overlapFactor: 0.5
        });

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

  // --- API Key ---
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

  // --- Limpiar chat ---
  function clearChat() {
    history = [];
    msgCount = 0;
    $('nx-messages').innerHTML = '';
    $('nx-msg-count').textContent = '0';
  }

  // --- Markdown → HTML (minimal) ---
  function md2html(text) {
    return text
      // Tablas
      .replace(/\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)*)/g, (_, header, rows) => {
        const ths = header.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
        const trs = rows.trim().split('\n').map(row => {
          const tds = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
          return `<tr>${tds}</tr>`;
        }).join('');
        return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
      })
      // Encabezados
      .replace(/^#{1,4} (.+)$/gm, '<h4>$1</h4>')
      // Negrita
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Itálica (usada como highlight)
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Código inline
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Listas
      .replace(/^[•\-\*] (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      // Párrafos
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
  }

  // --- Renderizar mensaje ---
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

  // --- Enter para enviar ---
  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  // --- Quick prompts ---
  function quickSend(text) {
    $('nx-input').value = text;
    send();
  }

  // --- Enviar mensaje ---
  async function send() {
    const input = $('nx-input');
    const userText = input.value.trim();
    if (!userText) return;
    
if (!apiKey) {
    appendMsg('ai', '⚠ Ingresa tu API Key arriba y pulsa ACTIVAR primero.');
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
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=TU_API_KEY_AQUI`, {
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

      thinkingEl.remove();
      appendMsg('ai', fullText);
      history.push({ role: 'assistant', content: fullText });
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
