/**
 * ============================================================================
 * GOOGLE APPS SCRIPT: PROCESADOR DE EVALUACIONES DE CONTRATISTAS ABB
 * ============================================================================
 * 
 * INSTRUCCIONES DE INSTALACIÓN:
 * 1. Abre https://script.google.com/ o una hoja de Google Sheets > Extensiones > Apps Script.
 * 2. Borra el código existente y pega TODO este archivo.
 * 3. Haz clic en "Implementar" (Deploy) > "Nueva implementación" (New deployment).
 * 4. Tipo: "Aplicación web" (Web app).
 * 5. Configuración:
 *    - Ejecutar como: "Yo" (Tu cuenta de Google).
 *    - Quién tiene acceso: "Cualquier usuario" (Anyone) -> [MUY IMPORTANTE].
 * 6. Haz clic en "Implementar", autoriza los permisos y copia la URL generada.
 * 7. Pega la URL en la constante GOOGLE_SCRIPT_URL de tu archivo app.js.
 */

function doPost(e) {
  try {
    var contents = e.postData ? e.postData.contents : "{}";
    var data = JSON.parse(contents);

    // 1. Datos Generales de la Evaluación
    var idEvaluacion = data.id || ("eval_" + new Date().getTime());
    var cliente = data.cliente || "No especificado";
    var os = data.os || "No especificado";
    var servicio = data.servicio || "No especificado";
    var supervisor = data.supervisorEvaluador || "No especificado";
    var fecha = data.fecha || new Date().toISOString().split("T")[0];
    
    // Correo de destino (usa el enviado desde el formulario o el por defecto)
    var emailDestino = data.destinationEmail || "geraldine.garcia-alarcon@pe.abb.com";

    // 2. Evaluaciones Operativos
    var opEvaluaciones = data.evaluacionesOperativos || [];
    var resumenOperativosHTML = "";
    var listaNombresOperativos = [];

    if (opEvaluaciones.length > 0) {
      resumenOperativosHTML += '<div style="margin-top: 10px;">';
      opEvaluaciones.forEach(function(op, idx) {
        listaNombresOperativos.push(op.empresa);
        resumenOperativosHTML += `
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 12px;">
            <div style="font-weight: 700; color: #0f172a; font-size: 14px; margin-bottom: 8px; border-bottom: 2px solid #e11414; padding-bottom: 4px; display: inline-block;">
              ${idx + 1}. Contratista: ${op.empresa}
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: #334155;">
              <tr><td style="padding: 4px 8px; font-weight: 600; width: 220px;">Equipos y Herramientas:</td><td style="padding: 4px 8px;"><strong>${op.equipos || '-'}</strong> / 5 ${op.equiposComentario ? `<em>(${op.equiposComentario})</em>` : ''}</td></tr>
              <tr><td style="padding: 4px 8px; font-weight: 600;">EPPs y Estado:</td><td style="padding: 4px 8px;"><strong>${op.epp || '-'}</strong> / 5 ${op.eppComentario ? `<em>(${op.eppComentario})</em>` : ''}</td></tr>
              <tr><td style="padding: 4px 8px; font-weight: 600;">Seguridad y Salud (HSE):</td><td style="padding: 4px 8px;"><strong>${op.seguridad || '-'}</strong> / 5 ${op.seguridadComentario ? `<em>(${op.seguridadComentario})</em>` : ''}</td></tr>
              <tr><td style="padding: 4px 8px; font-weight: 600;">Actitud y Predisposición:</td><td style="padding: 4px 8px;"><strong>${op.actitud || '-'}</strong> / 5 ${op.actitudComentario ? `<em>(${op.actitudComentario})</em>` : ''}</td></tr>
              <tr><td style="padding: 4px 8px; font-weight: 600;">Puntualidad:</td><td style="padding: 4px 8px;"><strong>${op.puntualidad || '-'}</strong> / 5 ${op.puntualidadComentario ? `<em>(${op.puntualidadComentario})</em>` : ''}</td></tr>
              <tr><td style="padding: 4px 8px; font-weight: 600;">Conocimiento Técnico:</td><td style="padding: 4px 8px;"><strong>${op.conocimiento || '-'}</strong> / 5 ${op.conocimientoComentario ? `<em>(${op.conocimientoComentario})</em>` : ''}</td></tr>
              <tr><td style="padding: 4px 8px; font-weight: 600;">Planificación y Criterio:</td><td style="padding: 4px 8px;"><strong>${op.planificacion || '-'}</strong> / 5 ${op.planificacionComentario ? `<em>(${op.planificacionComentario})</em>` : ''}</td></tr>
            </table>
          </div>
        `;
      });
      resumenOperativosHTML += '</div>';
    } else {
      resumenOperativosHTML = '<span style="color: #64748b; font-style: italic;">No se evaluaron contratistas operativos</span>';
    }

    // 3. Evaluación HSE
    var hse = data.evaluacionHSE;
    var resumenHseHTML = "";
    if (hse && hse.empresa) {
      resumenHseHTML = `
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px;">
          <div style="font-weight: 700; color: #0f172a; font-size: 14px; margin-bottom: 8px; border-bottom: 2px solid #e11414; padding-bottom: 4px; display: inline-block;">
            Empresa HSE: ${hse.empresa}
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: #334155;">
            <tr><td style="padding: 4px 8px; font-weight: 600; width: 220px;">Cumplimiento Normas HSE:</td><td style="padding: 4px 8px;"><strong>${hse.normas || '-'}</strong> / 5 ${hse.normasComentario ? `<em>(${hse.normasComentario})</em>` : ''}</td></tr>
            <tr><td style="padding: 4px 8px; font-weight: 600;">Liderazgo e Inspección:</td><td style="padding: 4px 8px;"><strong>${hse.liderazgo || '-'}</strong> / 5 ${hse.liderazgoComentario ? `<em>(${hse.liderazgoComentario})</em>` : ''}</td></tr>
            <tr><td style="padding: 4px 8px; font-weight: 600;">Reportes y Documentación:</td><td style="padding: 4px 8px;"><strong>${hse.reporte || '-'}</strong> / 5 ${hse.reporteComentario ? `<em>(${hse.reporteComentario})</em>` : ''}</td></tr>
            <tr><td style="padding: 4px 8px; font-weight: 600;">Actitud y Coordinación:</td><td style="padding: 4px 8px;"><strong>${hse.actitud || '-'}</strong> / 5 ${hse.actitudComentario ? `<em>(${hse.actitudComentario})</em>` : ''}</td></tr>
            <tr><td style="padding: 4px 8px; font-weight: 600;">Puntualidad:</td><td style="padding: 4px 8px;"><strong>${hse.puntualidad || '-'}</strong> / 5 ${hse.puntualidadComentario ? `<em>(${hse.puntualidadComentario})</em>` : ''}</td></tr>
          </table>
        </div>
      `;
    } else {
      resumenHseHTML = '<span style="color: #64748b; font-style: italic;">No aplicó evaluación HSE</span>';
    }

    // 4. Evaluación Almacén GEEP-TALLER
    var alm = data.evaluacionAlmacen;
    var resumenAlmHTML = "";
    if (alm && alm.empresa) {
      resumenAlmHTML = `
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px;">
          <div style="font-weight: 700; color: #0f172a; font-size: 14px; margin-bottom: 8px; border-bottom: 2px solid #e11414; padding-bottom: 4px; display: inline-block;">
            Área: ${alm.empresa}
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: #334155;">
            <tr><td style="padding: 4px 8px; font-weight: 600; width: 220px;">Tiempo de Respuesta:</td><td style="padding: 4px 8px;"><strong>${alm.tiempo || '-'}</strong> / 5 ${alm.tiempoComentario ? `<em>(${alm.tiempoComentario})</em>` : ''}</td></tr>
            <tr><td style="padding: 4px 8px; font-weight: 600;">Calidad de Herramientas/Materiales:</td><td style="padding: 4px 8px;"><strong>${alm.calidad || '-'}</strong> / 5 ${alm.calidadComentario ? `<em>(${alm.calidadComentario})</em>` : ''}</td></tr>
            <tr><td style="padding: 4px 8px; font-weight: 600;">Nivel de Servicio y Soporte:</td><td style="padding: 4px 8px;"><strong>${alm.servicio || '-'}</strong> / 5 ${alm.servicioComentario ? `<em>(${alm.servicioComentario})</em>` : ''}</td></tr>
          </table>
        </div>
      `;
    } else {
      resumenAlmHTML = '<span style="color: #64748b; font-style: italic;">No aplicó apoyo de almacén</span>';
    }

    // 5. Evaluación Movilidad
    var mov = data.evaluacionMovilidad;
    var resumenMovHTML = "";
    if (mov && mov.empresa) {
      resumenMovHTML = `
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px;">
          <div style="font-weight: 700; color: #0f172a; font-size: 14px; margin-bottom: 8px; border-bottom: 2px solid #e11414; padding-bottom: 4px; display: inline-block;">
            Empresa Movilidad: ${mov.empresa}
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: #334155;">
            <tr><td style="padding: 4px 8px; font-weight: 600; width: 220px;">Condición del Vehículo:</td><td style="padding: 4px 8px;"><strong>${mov.vehiculo || '-'}</strong> / 5 ${mov.vehiculoComentario ? `<em>(${mov.vehiculoComentario})</em>` : ''}</td></tr>
            <tr><td style="padding: 4px 8px; font-weight: 600;">Manejo Defensivo y Seguridad:</td><td style="padding: 4px 8px;"><strong>${mov.manejo || '-'}</strong> / 5 ${mov.manejoComentario ? `<em>(${mov.manejoComentario})</em>` : ''}</td></tr>
            <tr><td style="padding: 4px 8px; font-weight: 600;">Puntualidad en Rutas:</td><td style="padding: 4px 8px;"><strong>${mov.puntualidad || '-'}</strong> / 5 ${mov.puntualidadComentario ? `<em>(${mov.puntualidadComentario})</em>` : ''}</td></tr>
            <tr><td style="padding: 4px 8px; font-weight: 600;">Trato y Disposición:</td><td style="padding: 4px 8px;"><strong>${mov.trato || '-'}</strong> / 5 ${mov.tratoComentario ? `<em>(${mov.tratoComentario})</em>` : ''}</td></tr>
          </table>
        </div>
      `;
    } else {
      resumenMovHTML = '<span style="color: #64748b; font-style: italic;">No aplicó empresa de movilidad</span>';
    }

    // RAW JSON formateado
    var rawJson = JSON.stringify(data, null, 2);

    // Asunto del correo
    var contratistasStr = listaNombresOperativos.join(", ") || (hse ? hse.empresa : "Evaluación");
    var asunto = "[EVALUACION_ABB] " + cliente + " | OS: " + os + " | " + contratistasStr;

    // Cuerpo del Correo en HTML
    var tablaHTML = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 780px; margin: 0 auto; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        
        <!-- Header ABB -->
        <div style="background-color: #000000; padding: 20px 24px; border-bottom: 4px solid #e11414; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">ABB | Evaluación de Contratistas</h1>
            <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Nueva evaluación registrada en la plataforma</p>
          </div>
        </div>

        <!-- Información General -->
        <div style="padding: 20px 24px;">
          <h2 style="font-size: 16px; color: #0f172a; margin-top: 0; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
            📋 Datos Generales del Servicio
          </h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
            <tbody>
              <tr style="background-color: #f8fafc;">
                <td style="width: 200px; font-weight: 600; padding: 10px 14px; border: 1px solid #e2e8f0; color: #475569;">Cliente</td>
                <td style="padding: 10px 14px; border: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">${cliente}</td>
              </tr>
              <tr>
                <td style="font-weight: 600; padding: 10px 14px; border: 1px solid #e2e8f0; color: #475569; background-color: #f8fafc;">Orden de Servicio (OS)</td>
                <td style="padding: 10px 14px; border: 1px solid #e2e8f0; color: #0f172a;">${os}</td>
              </tr>
              <tr style="background-color: #f8fafc;">
                <td style="font-weight: 600; padding: 10px 14px; border: 1px solid #e2e8f0; color: #475569;">Nombre del Servicio</td>
                <td style="padding: 10px 14px; border: 1px solid #e2e8f0; color: #0f172a;">${servicio}</td>
              </tr>
              <tr>
                <td style="font-weight: 600; padding: 10px 14px; border: 1px solid #e2e8f0; color: #475569; background-color: #f8fafc;">Supervisor ABB Evaluador</td>
                <td style="padding: 10px 14px; border: 1px solid #e2e8f0; color: #0f172a;"><strong>${supervisor}</strong></td>
              </tr>
              <tr style="background-color: #f8fafc;">
                <td style="font-weight: 600; padding: 10px 14px; border: 1px solid #e2e8f0; color: #475569;">Fecha de Intervención</td>
                <td style="padding: 10px 14px; border: 1px solid #e2e8f0; color: #0f172a;">${fecha}</td>
              </tr>
              <tr>
                <td style="font-weight: 600; padding: 10px 14px; border: 1px solid #e2e8f0; color: #475569; background-color: #f8fafc;">ID de Registro</td>
                <td style="padding: 10px 14px; border: 1px solid #e2e8f0; color: #64748b; font-family: monospace; font-size: 12px;">${idEvaluacion}</td>
              </tr>
            </tbody>
          </table>

          <!-- Evaluaciones Operativas -->
          <h2 style="font-size: 16px; color: #0f172a; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
            🛠️ Evaluación de Contratistas Operativos
          </h2>
          ${resumenOperativosHTML}

          <!-- Evaluación HSE -->
          <h2 style="font-size: 16px; color: #0f172a; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
            🦺 Evaluación de Seguridad y Salud (HSE)
          </h2>
          ${resumenHseHTML}

          <!-- Evaluación Almacén -->
          <h2 style="font-size: 16px; color: #0f172a; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
            📦 Evaluación Apoyo de Almacén (GEEP - TALLER)
          </h2>
          ${resumenAlmHTML}

          <!-- Evaluación Movilidad -->
          <h2 style="font-size: 16px; color: #0f172a; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
            🚐 Evaluación de Movilidad / Transporte
          </h2>
          ${resumenMovHTML}

          <!-- Bloque RAW JSON -->
          <h2 style="font-size: 16px; color: #0f172a; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
            🧾 RAW JSON (Datos completos)
          </h2>
          <div style="background-color: #0f172a; border-radius: 6px; padding: 14px; margin-top: 8px;">
            <pre style="margin: 0; font-family: Consolas, 'Courier New', monospace; font-size: 11px; line-height: 1.4; color: #38bdf8; white-space: pre-wrap; word-break: break-all;">${rawJson}</pre>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 14px 24px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
          Este correo fue generado automáticamente por la Plataforma de Evaluación de Contratistas ABB.
        </div>
      </div>
    `;

    // 6. Enviar Correo Electrónico
    MailApp.sendEmail({
      to: emailDestino,
      subject: asunto,
      htmlBody: tablaHTML
    });

    // 7. (Opcional) Si este script está vinculado a una hoja de cálculo Google Sheets, guarda la fila
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      if (ss) {
        var sheet = ss.getActiveSheet();
        if (sheet.getLastRow() === 0) {
          sheet.appendRow(["Timestamp", "ID", "Cliente", "OS", "Servicio", "Supervisor Evaluador", "Fecha", "Contratistas Evaluados", "RAW_JSON"]);
        }
        sheet.appendRow([
          new Date(),
          idEvaluacion,
          cliente,
          os,
          servicio,
          supervisor,
          fecha,
          listaNombresOperativos.join(", "),
          rawJson
        ]);
      }
    } catch (eSheet) {
      Logger.log("No se guardó en Google Sheet (no vinculado): " + eSheet.toString());
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Evaluación enviada con éxito" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("Error en doPost: " + error.toString());
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
