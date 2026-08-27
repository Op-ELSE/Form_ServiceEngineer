// ==========================================================================
// CONFIGURACIÓN DE ENVÍO - GOOGLE APPS SCRIPT (100% LIBRE DE BLOQUEOS ABB)
// ==========================================================================
// Pega aquí la URL de la aplicación web que generas en Google Apps Script:
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw_WCZmHoXq0Cio-0aRSDb1CdoXxYpFpoIdTQejb_1STXyVtfe0gVs0pOo3kmXinhk9/exec";

// Correo donde recibirás las evaluaciones de los supervisores:
const DESTINATION_EMAIL = "geraldine.garcia-alarcon@pe.abb.com";

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

    // Auto pre-llenado desde parámetros de URL si existen
    loadQueryParams();
});

// ==========================================================================
// PRE-LLENADO AUTOMÁTICO VÍA URL (QUERY PARAMETERS)
// ==========================================================================
function loadQueryParams() {
    const params = new URLSearchParams(window.location.search);
    if (!window.location.search) return;

    // 1. Cliente (?cliente=...)
    if (params.has("cliente")) {
        const clienteInput = document.getElementById("input-cliente");
        if (clienteInput) clienteInput.value = params.get("cliente");
    }

    // 2. Orden de Servicio (?os=...)
    if (params.has("os")) {
        const osInput = document.getElementById("input-os");
        if (osInput) osInput.value = params.get("os");
    }

    // 3. Nombre del Servicio (?servicio=...)
    if (params.has("servicio")) {
        const servInput = document.getElementById("input-servicio");
        if (servInput) servInput.value = params.get("servicio");
    }

    // 4. Supervisor ABB (?supervisor=...)
    if (params.has("supervisor")) {
        const supVal = params.get("supervisor");
        const select = document.getElementById("input-supervisor-evaluador");
        if (select) {
            let found = false;
            for (let opt of select.options) {
                if (opt.value.toLowerCase() === supVal.toLowerCase()) {
                    select.value = opt.value;
                    found = true;
                    break;
                }
            }
            if (!found) {
                select.value = "OTRO";
                toggleSupervisorOtro();
                const otroInput = document.getElementById("input-supervisor-otro");
                if (otroInput) otroInput.value = supVal;
            }
        }
    }

    // 5. Fecha (?fecha=AAAA-MM-DD)
    if (params.has("fecha")) {
        const fechaInput = document.getElementById("input-fecha");
        if (fechaInput) fechaInput.value = params.get("fecha");
    }

    // 6. Contratistas Operativos (?operativos=COSERPO,HITACHI)
    if (params.has("operativos")) {
        const opList = params.get("operativos").split(",").map(s => s.trim().toUpperCase());
        const checkboxes = document.querySelectorAll('input[name="check-contratistas-op"]');
        let otros = [];
        opList.forEach(target => {
            let matched = false;
            checkboxes.forEach(cb => {
                if (cb.value.toUpperCase() === target) {
                    cb.checked = true;
                    matched = true;
                }
            });
            if (!matched && target !== "OTRO") {
                otros.push(target);
            }
        });
        if (otros.length > 0) {
            const checkOtro = document.getElementById("check-op-otro");
            if (checkOtro) {
                checkOtro.checked = true;
                toggleContratistaOpOtro();
                const inputOtro = document.getElementById("input-op-otro");
                if (inputOtro) inputOtro.value = otros.join(", ");
            }
        }
    }

    // 7. Empresa HSE (?hse=GREENPROSOL)
    if (params.has("hse")) {
        const hseVal = params.get("hse");
        const selectHse = document.getElementById("select-contratista-hse");
        if (selectHse) {
            let found = false;
            for (let opt of selectHse.options) {
                if (opt.value.toLowerCase() === hseVal.toLowerCase()) {
                    selectHse.value = opt.value;
                    found = true;
                    break;
                }
            }
            if (!found) {
                selectHse.value = "OTRO";
                toggleHseOtro();
                const inputOtro = document.getElementById("input-hse-otro");
                if (inputOtro) inputOtro.value = hseVal;
            }
        }
    }

    // 8. Apoyo de Almacén (?almacen=SI o ?almacen=NO)
    if (params.has("almacen")) {
        const almVal = params.get("almacen").toUpperCase();
        const radios = document.getElementsByName("radio_almacen");
        for (let r of radios) {
            r.checked = (r.value === almVal);
        }
    }

    // 9. Empresa de Movilidad (?movilidad=Triny Rental)
    if (params.has("movilidad")) {
        const movVal = params.get("movilidad");
        const selectMov = document.getElementById("select-contratista-movilidad");
        if (selectMov) {
            let found = false;
            for (let opt of selectMov.options) {
                if (opt.value.toLowerCase() === movVal.toLowerCase()) {
                    selectMov.value = opt.value;
                    found = true;
                    break;
                }
            }
            if (!found) {
                selectMov.value = "OTRO";
                toggleMovilidadOtro();
                const inputOtro = document.getElementById("input-movilidad-otro");
                if (inputOtro) inputOtro.value = movVal;
            }
        }
    }
}

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
        evaluacionMovilidad: evaluacionMovilidad,
        destinationEmail: DESTINATION_EMAIL
    };

    // Guardar en localStorage como respaldo
    const stored = JSON.parse(localStorage.getItem("abb_contratistas_evals") || "[]");
    stored.push(payloadFinal);
    localStorage.setItem("abb_contratistas_evals", JSON.stringify(stored));

    try {
        if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL !== "PEGAR_AQUI_TU_URL_DE_GOOGLE_APPS_SCRIPT") {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: "POST",
                mode: "no-cors",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payloadFinal)
            });
            console.log("Evaluación enviada con éxito a Google Apps Script");
        } else {
            console.warn("URL de Google Apps Script no configurada aún en app.js");
        }

        currentStepIndex = stepSequence.length - 1; // Paso success
        renderCurrentStep();
    } catch (err) {
        console.error("Error al conectar con Google Apps Script:", err);
        // Aun con error de red avanza porque ya quedó en localStorage
        currentStepIndex = stepSequence.length - 1;
        renderCurrentStep();
    }
}

function resetSurvey() {
    // Reset de formularios
    const fGen = document.getElementById("form-general");
    if (fGen) fGen.reset();
    const fOp = document.getElementById("form-op-eval");
    if (fOp) fOp.reset();
    const fHse = document.getElementById("form-hse-eval");
    if (fHse) fHse.reset();
    const fAlm = document.getElementById("form-almacen-eval");
    if (fAlm) fAlm.reset();
    const fMov = document.getElementById("form-movilidad-eval");
    if (fMov) fMov.reset();

    const inputFecha = document.getElementById("input-fecha");
    if (inputFecha) inputFecha.valueAsDate = new Date();
    
    // Reset checkboxes y opciones dinámicas
    document.querySelectorAll('input[name="check-contratistas-op"]').forEach(cb => cb.checked = false);
    toggleSupervisorOtro();
    toggleContratistaOpOtro();
    toggleHseOtro();
    toggleMovilidadOtro();

    // Reset variables y reiniciar secuencia en "general"
    stepSequence = ["general"];
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
