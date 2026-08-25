// ==========================================================================
// APP LOGIC - EVALUACIÓN DE CONTRATISTAS (SUPERVISORES ABB)
// ==========================================================================

// Configuración de Envío por Correo (Compatible con ABB DLP)
const EMAIL_CONFIG = {
    destinationEmail: "geraldine.garcia-alarcon@pe.abb.com",
    subjectPrefix: "[EVAL_CONTRATISTA_ABB]"
};

// Estado global de la evaluación
let currentStepIndex = 0;
let stepSequence = []; // Lista ordenada de pasos dinámicos: ["general", "op-0", "op-1", "hse", "almacen", "movilidad", "success"]

// Datos temporales recopilados
let datosGenerales = {};
let contratistasOpList = []; // Lista de nombres de contratistas operativos seleccionados
let currentOpIndex = 0;

let evaluacionesOperativos = [];
let evaluacionHSE = null;
let evaluacionAlmacen = null;
let evaluacionMovilidad = null;

// Inicialización
window.addEventListener("DOMContentLoaded", () => {
    // Fecha actual por defecto
    const inputFecha = document.getElementById("input-fecha");
    if (inputFecha) inputFecha.valueAsDate = new Date();
});

// ==========================================================================
// CONTROLADORES DE CAMPOS "OTRO"
// ==========================================================================
function toggleSupervisorOtro() {
    const select = document.getElementById("input-supervisor-evaluador");
    const group = document.getElementById("group-supervisor-otro");
    const input = document.getElementById("input-supervisor-otro");
    if (select.value === "OTRO") {
        group.style.display = "block";
        input.required = true;
        input.focus();
    } else {
        group.style.display = "none";
        input.required = false;
        input.value = "";
    }
}

function toggleContratistaOpOtro() {
    const check = document.getElementById("check-op-otro");
    const group = document.getElementById("group-op-otro");
    const input = document.getElementById("input-op-otro");
    if (check.checked) {
        group.style.display = "block";
        input.required = true;
        input.focus();
    } else {
        group.style.display = "none";
        input.required = false;
        input.value = "";
    }
}

function toggleHseOtro() {
    const select = document.getElementById("select-contratista-hse");
    const group = document.getElementById("group-hse-otro");
    const input = document.getElementById("input-hse-otro");
    if (select.value === "OTRO") {
        group.style.display = "block";
        input.required = true;
        input.focus();
    } else {
        group.style.display = "none";
        input.required = false;
        input.value = "";
    }
}

function toggleMovilidadOtro() {
    const select = document.getElementById("select-contratista-movilidad");
    const group = document.getElementById("group-movilidad-otro");
    const input = document.getElementById("input-movilidad-otro");
    if (select.value === "OTRO") {
        group.style.display = "block";
        input.required = true;
        input.focus();
    } else {
        group.style.display = "none";
        input.required = false;
        input.value = "";
    }
}

// ==========================================================================
// CONSTRUCCIÓN DE LA SECUENCIA DE PASOS (WIZARD DINÁMICO)
// ==========================================================================
function buildStepSequence() {
    stepSequence = ["general"];
    
    // Contratistas Operativos seleccionados
    contratistasOpList.forEach((_, idx) => {
        stepSequence.push(`op-${idx}`);
    });

    // Contratista HSE (si no es NINGUNO)
    if (datosGenerales.contratistaHSE && datosGenerales.contratistaHSE !== "NINGUNO") {
        stepSequence.push("hse");
    }

    // Almacén (si es SI)
    if (datosGenerales.recibioAlmacen === "SI") {
        stepSequence.push("almacen");
    }

    // Movilidad (si no es NINGUNO)
    if (datosGenerales.contratistaMovilidad && datosGenerales.contratistaMovilidad !== "NINGUNO") {
        stepSequence.push("movilidad");
    }

    // Pantalla final de éxito
    stepSequence.push("success");
}

// ==========================================================================
// NAVEGACIÓN Y RENDERIZADO DE PASOS
// ==========================================================================
function renderCurrentStep() {
    const currentStepId = stepSequence[currentStepIndex];
    
    // Ocultar todos los steps
    document.querySelectorAll(".survey-step").forEach(el => el.classList.remove("active-step"));

    // Actualizar barra de progreso
    const totalSteps = stepSequence.length - 1; // Excluye el success del conteo visual
    const progressPercent = totalSteps > 0 ? (currentStepIndex / totalSteps) * 100 : 0;
    document.getElementById("survey-progress").style.width = `${Math.min(progressPercent, 100)}%`;

    // Actualizar puntos de navegación
    updateStepDots(currentStepId);

    // Scroll al inicio de la tarjeta
    const card = document.querySelector(".survey-card");
    if (card) card.scrollIntoView({ behavior: "smooth" });

    // Renderizar la vista correspondiente
    if (currentStepId === "general") {
        document.getElementById("step-general").classList.add("active-step");
    } else if (currentStepId.startsWith("op-")) {
        const opIndex = parseInt(currentStepId.split("-")[1], 10);
        currentOpIndex = opIndex;
        setupOpStep(opIndex);
        document.getElementById("step-operativos-eval").classList.add("active-step");
    } else if (currentStepId === "hse") {
        setupHseStep();
        document.getElementById("step-hse-eval").classList.add("active-step");
    } else if (currentStepId === "almacen") {
        setupAlmacenStep();
        document.getElementById("step-almacen-eval").classList.add("active-step");
    } else if (currentStepId === "movilidad") {
        setupMovilidadStep();
        document.getElementById("step-movilidad-eval").classList.add("active-step");
    } else if (currentStepId === "success") {
        document.getElementById("step-success").classList.add("active-step");
        document.getElementById("survey-progress").style.width = "100%";
    }
}

function updateStepDots(currentStepId) {
    const dotMap = {
        "general": 1,
        "op": 2,
        "hse": 3,
        "almacen": 4,
        "movilidad": 5,
        "success": 6
    };

    let activeCategory = "general";
    if (currentStepId.startsWith("op-")) activeCategory = "op";
    else if (currentStepId === "hse") activeCategory = "hse";
    else if (currentStepId === "almacen") activeCategory = "almacen";
    else if (currentStepId === "movilidad") activeCategory = "movilidad";
    else if (currentStepId === "success") activeCategory = "success";

    const activeNum = dotMap[activeCategory];
    
    for (let i = 1; i <= 6; i++) {
        const dot = document.getElementById(`dot-${i}`);
        if (dot) {
            dot.classList.toggle("active", i === activeNum);
            dot.classList.toggle("completed", i < activeNum);
        }
    }
}

// Avanzar desde el Paso 1 (Datos Generales)
function nextStep() {
    if (stepSequence[currentStepIndex] === "general" || currentStepIndex === 0) {
        // Validar supervisor evaluador
        const supSelect = document.getElementById("input-supervisor-evaluador").value;
        const supNombre = supSelect === "OTRO" 
            ? document.getElementById("input-supervisor-otro").value.trim() 
            : supSelect;

        if (!supNombre) {
            alert("Por favor seleccione o ingrese el nombre del supervisor ABB evaluador.");
            return;
        }

        // Recopilar contratistas operativos
        contratistasOpList = [];
        const checkboxes = document.querySelectorAll('input[name="check-contratistas-op"]:checked');
        checkboxes.forEach(cb => {
            if (cb.value === "OTRO") {
                const otroVal = document.getElementById("input-op-otro").value.trim();
                if (otroVal) contratistasOpList.push(otroVal);
            } else {
                contratistasOpList.push(cb.value);
            }
        });

        // Validar HSE
        const hseSelect = document.getElementById("select-contratista-hse").value;
        const hseNombre = hseSelect === "OTRO" 
            ? document.getElementById("input-hse-otro").value.trim() 
            : hseSelect;

        // Validar Almacén
        const almacRadio = document.querySelector('input[name="radio_almacen"]:checked');
        const recibioAlmacen = almacRadio ? almacRadio.value : "NO";

        // Validar Movilidad
        const movSelect = document.getElementById("select-contratista-movilidad").value;
        const movNombre = movSelect === "OTRO" 
            ? document.getElementById("input-movilidad-otro").value.trim() 
            : movSelect;

        // Validar que al menos se haya seleccionado un contratista o apoyo para evaluar
        if (contratistasOpList.length === 0 && hseNombre === "NINGUNO" && recibioAlmacen === "NO" && movNombre === "NINGUNO") {
            alert("Debe seleccionar al menos un Contratista Operativo, Empresa HSE, Apoyo de Almacén o Movilidad para realizar la evaluación.");
            return;
        }

        // Guardar datos generales
        datosGenerales = {
            id: "eval_" + Date.now(),
            cliente: document.getElementById("input-cliente").value.trim(),
            os: document.getElementById("input-os").value.trim(),
            servicio: document.getElementById("input-servicio").value.trim(),
            supervisorEvaluador: supNombre,
            fecha: document.getElementById("input-fecha").value,
            contratistaHSE: hseNombre,
            recibioAlmacen: recibioAlmacen,
            contratistaMovilidad: movNombre
        };

        // Reiniciar estructuras de evaluaciones
        evaluacionesOperativos = [];
        evaluacionHSE = null;
        evaluacionAlmacen = null;
        evaluacionMovilidad = null;

        // Construir la secuencia de pasos y avanzar al primer paso de evaluación
        buildStepSequence();
        currentStepIndex = 1;
        renderCurrentStep();
    }
}

// Retroceder al paso anterior
function prevStep() {
    if (currentStepIndex > 0) {
        currentStepIndex--;
        renderCurrentStep();
    }
}

// ==========================================================================
// CONFIGURACIÓN Y ENVÍO POR SECCIÓN
// ==========================================================================

// 1. CONTRATISTAS OPERATIVOS
function setupOpStep(index) {
    const opName = contratistasOpList[index];
    document.getElementById("eval-op-title").textContent = `2. Evaluación de Contratista Operativo (${index + 1}/${contratistasOpList.length})`;
    document.getElementById("eval-op-name").textContent = opName;

    const submitBtn = document.getElementById("btn-submit-op");
    submitBtn.innerHTML = `
        Siguiente
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
    `;

    // Cargar si ya se había guardado o limpiar
    const existing = evaluacionesOperativos[index];
    if (existing) {
        setRadioVal("q_op_equipos", existing.equipos);
        document.getElementById("comm_q_op_equipos").value = existing.equiposComentario;

        setRadioVal("q_op_epp", existing.epp);
        document.getElementById("comm_q_op_epp").value = existing.eppComentario;

        setRadioVal("q_op_seguridad", existing.seguridad);
        document.getElementById("comm_q_op_seguridad").value = existing.seguridadComentario;

        setRadioVal("q_op_actitud", existing.actitud);
        document.getElementById("comm_q_op_actitud").value = existing.actitudComentario;

        setRadioVal("q_op_puntualidad", existing.puntualidad);
        document.getElementById("comm_q_op_puntualidad").value = existing.puntualidadComentario;

        setRadioVal("q_op_conocimiento", existing.conocimiento);
        document.getElementById("comm_q_op_conocimiento").value = existing.conocimientoComentario;

        setRadioVal("q_op_planificacion", existing.planificacion);
        document.getElementById("comm_q_op_planificacion").value = existing.planificacionComentario;
    } else {
        clearRadioGroup("q_op_equipos");
        document.getElementById("comm_q_op_equipos").value = "";

        clearRadioGroup("q_op_epp");
        document.getElementById("comm_q_op_epp").value = "";

        clearRadioGroup("q_op_seguridad");
        document.getElementById("comm_q_op_seguridad").value = "";

        clearRadioGroup("q_op_actitud");
        document.getElementById("comm_q_op_actitud").value = "";

        clearRadioGroup("q_op_puntualidad");
        document.getElementById("comm_q_op_puntualidad").value = "";

        clearRadioGroup("q_op_conocimiento");
        document.getElementById("comm_q_op_conocimiento").value = "";

        clearRadioGroup("q_op_planificacion");
        document.getElementById("comm_q_op_planificacion").value = "";
    }
}

function submitOpEval() {
    const evalData = {
        empresa: contratistasOpList[currentOpIndex],
        equipos: getRadioVal("q_op_equipos"),
        equiposComentario: document.getElementById("comm_q_op_equipos").value.trim(),
        epp: getRadioVal("q_op_epp"),
        eppComentario: document.getElementById("comm_q_op_epp").value.trim(),
        seguridad: getRadioVal("q_op_seguridad"),
        seguridadComentario: document.getElementById("comm_q_op_seguridad").value.trim(),
        actitud: getRadioVal("q_op_actitud"),
        actitudComentario: document.getElementById("comm_q_op_actitud").value.trim(),
        puntualidad: getRadioVal("q_op_puntualidad"),
        puntualidadComentario: document.getElementById("comm_q_op_puntualidad").value.trim(),
        conocimiento: getRadioVal("q_op_conocimiento"),
        conocimientoComentario: document.getElementById("comm_q_op_conocimiento").value.trim(),
        planificacion: getRadioVal("q_op_planificacion"),
        planificacionComentario: document.getElementById("comm_q_op_planificacion").value.trim()
    };

    evaluacionesOperativos[currentOpIndex] = evalData;

    // Avanzar al siguiente paso de la secuencia
    advanceOrFinish();
}

// 2. CONTRATISTA HSE
function setupHseStep() {
    document.getElementById("eval-hse-name").textContent = datosGenerales.contratistaHSE;
    if (evaluacionHSE) {
        setRadioVal("q_hse_normas", evaluacionHSE.normas);
        document.getElementById("comm_q_hse_normas").value = evaluacionHSE.normasComentario;
        setRadioVal("q_hse_liderazgo", evaluacionHSE.liderazgo);
        document.getElementById("comm_q_hse_liderazgo").value = evaluacionHSE.liderazgoComentario;
        setRadioVal("q_hse_reporte", evaluacionHSE.reporte);
        document.getElementById("comm_q_hse_reporte").value = evaluacionHSE.reporteComentario;
        setRadioVal("q_hse_actitud", evaluacionHSE.actitud);
        document.getElementById("comm_q_hse_actitud").value = evaluacionHSE.actitudComentario;
        setRadioVal("q_hse_puntualidad", evaluacionHSE.puntualidad);
        document.getElementById("comm_q_hse_puntualidad").value = evaluacionHSE.puntualidadComentario;
    } else {
        clearRadioGroup("q_hse_normas");
        document.getElementById("comm_q_hse_normas").value = "";
        clearRadioGroup("q_hse_liderazgo");
        document.getElementById("comm_q_hse_liderazgo").value = "";
        clearRadioGroup("q_hse_reporte");
        document.getElementById("comm_q_hse_reporte").value = "";
        clearRadioGroup("q_hse_actitud");
        document.getElementById("comm_q_hse_actitud").value = "";
        clearRadioGroup("q_hse_puntualidad");
        document.getElementById("comm_q_hse_puntualidad").value = "";
    }
}

function submitHseEval() {
    evaluacionHSE = {
        empresa: datosGenerales.contratistaHSE,
        normas: getRadioVal("q_hse_normas"),
        normasComentario: document.getElementById("comm_q_hse_normas").value.trim(),
        liderazgo: getRadioVal("q_hse_liderazgo"),
        liderazgoComentario: document.getElementById("comm_q_hse_liderazgo").value.trim(),
        reporte: getRadioVal("q_hse_reporte"),
        reporteComentario: document.getElementById("comm_q_hse_reporte").value.trim(),
        actitud: getRadioVal("q_hse_actitud"),
        actitudComentario: document.getElementById("comm_q_hse_actitud").value.trim(),
        puntualidad: getRadioVal("q_hse_puntualidad"),
        puntualidadComentario: document.getElementById("comm_q_hse_puntualidad").value.trim()
    };
    advanceOrFinish();
}

// 3. ALMACÉN GEEP-TALLER
function setupAlmacenStep() {
    if (evaluacionAlmacen) {
        setRadioVal("q_alm_tiempo", evaluacionAlmacen.tiempo);
        document.getElementById("comm_q_alm_tiempo").value = evaluacionAlmacen.tiempoComentario;
        setRadioVal("q_alm_calidad", evaluacionAlmacen.calidad);
        document.getElementById("comm_q_alm_calidad").value = evaluacionAlmacen.calidadComentario;
        setRadioVal("q_alm_servicio", evaluacionAlmacen.servicio);
        document.getElementById("comm_q_alm_servicio").value = evaluacionAlmacen.servicioComentario;
    } else {
        clearRadioGroup("q_alm_tiempo");
        document.getElementById("comm_q_alm_tiempo").value = "";
        clearRadioGroup("q_alm_calidad");
        document.getElementById("comm_q_alm_calidad").value = "";
        clearRadioGroup("q_alm_servicio");
        document.getElementById("comm_q_alm_servicio").value = "";
    }
}

function submitAlmacenEval() {
    evaluacionAlmacen = {
        empresa: "GEEP - TALLER",
        tiempo: getRadioVal("q_alm_tiempo"),
        tiempoComentario: document.getElementById("comm_q_alm_tiempo").value.trim(),
        calidad: getRadioVal("q_alm_calidad"),
        calidadComentario: document.getElementById("comm_q_alm_calidad").value.trim(),
        servicio: getRadioVal("q_alm_servicio"),
        servicioComentario: document.getElementById("comm_q_alm_servicio").value.trim()
    };
    advanceOrFinish();
}

// 4. MOVILIDAD / TRANSPORTE
function setupMovilidadStep() {
    document.getElementById("eval-movilidad-name").textContent = datosGenerales.contratistaMovilidad;
    if (evaluacionMovilidad) {
        setRadioVal("q_mov_vehiculo", evaluacionMovilidad.vehiculo);
        document.getElementById("comm_q_mov_vehiculo").value = evaluacionMovilidad.vehiculoComentario;
        setRadioVal("q_mov_manejo", evaluacionMovilidad.manejo);
        document.getElementById("comm_q_mov_manejo").value = evaluacionMovilidad.manejoComentario;
        setRadioVal("q_mov_puntualidad", evaluacionMovilidad.puntualidad);
        document.getElementById("comm_q_mov_puntualidad").value = evaluacionMovilidad.puntualidadComentario;
        setRadioVal("q_mov_trato", evaluacionMovilidad.trato);
        document.getElementById("comm_q_mov_trato").value = evaluacionMovilidad.tratoComentario;
    } else {
        clearRadioGroup("q_mov_vehiculo");
        document.getElementById("comm_q_mov_vehiculo").value = "";
        clearRadioGroup("q_mov_manejo");
        document.getElementById("comm_q_mov_manejo").value = "";
        clearRadioGroup("q_mov_puntualidad");
        document.getElementById("comm_q_mov_puntualidad").value = "";
        clearRadioGroup("q_mov_trato");
        document.getElementById("comm_q_mov_trato").value = "";
    }
}

function submitMovilidadEval() {
    evaluacionMovilidad = {
        empresa: datosGenerales.contratistaMovilidad,
        vehiculo: getRadioVal("q_mov_vehiculo"),
        vehiculoComentario: document.getElementById("comm_q_mov_vehiculo").value.trim(),
        manejo: getRadioVal("q_mov_manejo"),
        manejoComentario: document.getElementById("comm_q_mov_manejo").value.trim(),
        puntualidad: getRadioVal("q_mov_puntualidad"),
        puntualidadComentario: document.getElementById("comm_q_mov_puntualidad").value.trim(),
        trato: getRadioVal("q_mov_trato"),
        tratoComentario: document.getElementById("comm_q_mov_trato").value.trim()
    };
    advanceOrFinish();
}

// Control central de avance o envío final
function advanceOrFinish() {
    if (currentStepIndex < stepSequence.length - 2) {
        currentStepIndex++;
        renderCurrentStep();
    } else {
        // Último paso completado -> Enviar evaluación completa
        saveAndSendFullEvaluation();
    }
}

// ==========================================================================
// ENVÍO DE LA EVALUACIÓN COMPLETA
// ==========================================================================
async function saveAndSendFullEvaluation() {
    const payloadFinal = {
        id: datosGenerales.id,
        cliente: datosGenerales.cliente,
        os: datosGenerales.os,
        servicio: datosGenerales.servicio,
        supervisorEvaluador: datosGenerales.supervisorEvaluador,
        fecha: datosGenerales.fecha,
        evaluacionesOperativos: evaluacionesOperativos,
        evaluacionHSE: evaluacionHSE,
        evaluacionAlmacen: evaluacionAlmacen,
        evaluacionMovilidad: evaluacionMovilidad
    };

    // Guardar en localStorage como respaldo
    const stored = JSON.parse(localStorage.getItem("abb_contratistas_evals") || "[]");
    stored.push(payloadFinal);
    localStorage.setItem("abb_contratistas_evals", JSON.stringify(stored));

    // Resumen para el correo
    let resumenOperativos = evaluacionesOperativos.map(op => {
        return `[${op.empresa}] Equipos=${op.equipos}, EPP=${op.epp}, Seg=${op.seguridad}, Actitud=${op.actitud}, Puntual=${op.puntualidad}, Tec=${op.conocimiento}, Plan=${op.planificacion}`;
    }).join(" | ");

    let resumenHSE = evaluacionHSE 
        ? `[${evaluacionHSE.empresa}] Normas=${evaluacionHSE.normas}, Liderazgo=${evaluacionHSE.liderazgo}, Reporte=${evaluacionHSE.reporte}, Actitud=${evaluacionHSE.actitud}, Puntual=${evaluacionHSE.puntualidad}`
        : "No aplica";

    let resumenAlmacen = evaluacionAlmacen 
        ? `[GEEP-TALLER] Tiempo=${evaluacionAlmacen.tiempo}, Calidad=${evaluacionAlmacen.calidad}, Servicio=${evaluacionAlmacen.servicio}`
        : "No aplica";

    let resumenMovilidad = evaluacionMovilidad 
        ? `[${evaluacionMovilidad.empresa}] Vehiculo=${evaluacionMovilidad.vehiculo}, Manejo=${evaluacionMovilidad.manejo}, Puntual=${evaluacionMovilidad.puntualidad}, Trato=${evaluacionMovilidad.trato}`
        : "No aplica";

    const emailBody = {
        "_subject": `${EMAIL_CONFIG.subjectPrefix} - OS: ${payloadFinal.os} - ${payloadFinal.cliente} (${payloadFinal.servicio})`,
        "_template": "table",
        "_captcha": "false",
        "ID_Evaluacion": payloadFinal.id,
        "Orden_Servicio_OS": payloadFinal.os,
        "Cliente": payloadFinal.cliente,
        "Servicio": payloadFinal.servicio,
        "Supervisor_ABB_Evaluador": payloadFinal.supervisorEvaluador,
        "Fecha_Intervencion": payloadFinal.fecha,
        "Evaluacion_Operativos": resumenOperativos || "No aplica",
        "Evaluacion_HSE": resumenHSE,
        "Evaluacion_Almacen": resumenAlmacen,
        "Evaluacion_Movilidad": resumenMovilidad,
        "RAW_JSON": JSON.stringify(payloadFinal, null, 2)
    };

    try {
        await submitFormBackground(emailBody);
        currentStepIndex = stepSequence.length - 1; // Paso success
        renderCurrentStep();
    } catch (err) {
        console.error("Error al enviar evaluación:", err);
        // Aun con error visual se avanza a la pantalla de éxito porque ya quedó guardado en localStorage
        currentStepIndex = stepSequence.length - 1;
        renderCurrentStep();
    }
}

// Envío nativo en segundo plano libre de CORS
function submitFormBackground(data) {
    return new Promise((resolve) => {
        let iframe = document.getElementById("hidden-submit-iframe");
        if (!iframe) {
            iframe = document.createElement("iframe");
            iframe.id = "hidden-submit-iframe";
            iframe.name = "hidden-submit-iframe";
            iframe.style.display = "none";
            document.body.appendChild(iframe);
        }

        const form = document.createElement("form");
        form.method = "POST";
        form.action = `https://formsubmit.co/${EMAIL_CONFIG.destinationEmail}`;
        form.target = "hidden-submit-iframe";
        form.style.display = "none";

        for (const [key, value] of Object.entries(data)) {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = key;
            input.value = typeof value === "object" ? JSON.stringify(value) : value;
            form.appendChild(input);
        }

        document.body.appendChild(form);

        let finished = false;
        iframe.onload = () => {
            if (!finished) {
                finished = true;
                form.remove();
                resolve(true);
            }
        };

        setTimeout(() => {
            if (!finished) {
                finished = true;
                form.remove();
                resolve(true);
            }
        }, 2200);

        form.submit();
    });
}

function resetSurvey() {
    document.getElementById("form-general").reset();
    document.getElementById("input-fecha").valueAsDate = new Date();
    
    // Reset checkboxes y opciones dinámicas
    document.querySelectorAll('input[name="check-contratistas-op"]').forEach(cb => cb.checked = false);
    toggleSupervisorOtro();
    toggleContratistaOpOtro();
    toggleHseOtro();
    toggleMovilidadOtro();

    // Reset variables
    stepSequence = [];
    currentStepIndex = 0;
    datosGenerales = {};
    contratistasOpList = [];
    currentOpIndex = 0;
    evaluacionesOperativos = [];
    evaluacionHSE = null;
    evaluacionAlmacen = null;
    evaluacionMovilidad = null;

    renderCurrentStep();
}

// ==========================================================================
// UTILITARIOS DE RADIO BUTTONS
// ==========================================================================
function getRadioVal(name) {
    const radios = document.getElementsByName(name);
    for (let r of radios) {
        if (r.checked) return r.value;
    }
    return "";
}

function setRadioVal(name, value) {
    const radios = document.getElementsByName(name);
    for (let r of radios) {
        r.checked = (r.value === value);
    }
}

function clearRadioGroup(name) {
    const radios = document.getElementsByName(name);
    for (let r of radios) {
        r.checked = false;
    }
}
