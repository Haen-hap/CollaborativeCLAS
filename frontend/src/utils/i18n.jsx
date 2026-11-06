import { useCallback, useEffect, useState } from "react";

export const LANGUAGE_KEY = "cclas_language";
export const LANGUAGE_EVENT = "cclas-language-change";

const FALLBACK_MESSAGES = {
  es: {
    "app.title": "GBM CCLAS · La Ruta de Nina",
    "language.group": "Idioma",
    "language.spanish": "Cambiar idioma a Español",
    "language.english": "Cambiar idioma a Inglés",
    "qr.badge": "CREDENCIAL · QR",
    "qr.kicker": "Punto de Acceso Comunitario · Smart Oasis",
    "qr.title": "Pase de Ingreso Digital",
    "qr.summary":
      "Escanee este código desde la cámara del teléfono para iniciar la evaluación sin necesidad de cuenta ni contraseña.",
    "qr.canvasAria": "Código QR de acceso para {url}",
    "qr.faultPrefix": "Error al generar la matriz: {message}",
    "qr.faultDefault": "No se pudo sintetizar la matriz.",
    "qr.caption": "Codificación ISO/IEC 18004 · Nivel L",
    "qr.meta.rootLabel": "Destino raíz",
    "qr.meta.modeLabel": "Modo de entrada",
    "qr.meta.modeValue": "Cero teclado · Anónimo (Ley 81)",
    "qr.download": "Descargar credencial PNG",
    "qr.networkHint":
      "Mantenga el teléfono y el servidor en la misma red Wi-Fi cuando opere en entorno local de kiosco.",
    "analytics.gate.eyebrow": "Acceso institucional",
    "analytics.gate.title": "Centro de analítica",
    "analytics.gate.copy":
      "Accede al panel de impacto comunitario con tu PIN autorizado.",
    "analytics.gate.pinLabel": "PIN de acceso",
    "analytics.gate.pinError":
      "PIN incorrecto. Verifica tus credenciales e inténtalo de nuevo.",
    "analytics.gate.unlock": "Desbloquear dashboard",
    "analytics.gate.backLink": "Volver a la evaluación",
    "analytics.header.eyebrow": "CCLAS · TELEMETRÍA",
    "analytics.header.title": "Impacto comunitario",
    "analytics.tabs.aria": "Vistas del centro de analítica",
    "analytics.tabs.general": "Resumen general",
    "analytics.tabs.territorial": "Análisis territorial",
    "analytics.source.live": "Datos conectados",
    "analytics.source.demo": "Datos de demostración",
    "analytics.actions.simulate": "Simular muestra",
    "analytics.actions.simulateTitle":
      "Generar una muestra simulada de 50 sesiones",
    "analytics.actions.simulateAria": "Simular muestra de 50 sesiones",
    "analytics.actions.restore": "Restaurar",
    "analytics.actions.restoreTitle": "Restaurar los datos reales",
    "analytics.actions.restoreAria": "Restaurar datos reales",
    "analytics.actions.csvTitle": "Exportar los datos en CSV",
    "analytics.actions.csvAria": "Exportar CSV",
    "analytics.actions.jsonTitle": "Exportar los datos en JSON",
    "analytics.actions.jsonAria": "Exportar JSON",
    "analytics.actions.lock": "Bloquear",
    "analytics.actions.lockTitle": "Bloquear la vista",
    "analytics.actions.lockAria": "Bloquear vista",
    "analytics.notice.syncing": "Sincronizando datos…",
    "analytics.notice.offline":
      "Servicio no disponible: se muestran datos de demostración.",
    "analytics.metrics.aria": "Indicadores principales",
    "analytics.metrics.totalSessions": "Sesiones totales",
    "analytics.metrics.cumulativeParticipation": "Participación acumulada",
    "analytics.metrics.completionRate": "Tasa de finalización",
    "analytics.metrics.completedOfTotal": "{completed} de {total} sesiones",
    "analytics.metrics.abandonmentRate": "Tasa de abandono",
    "analytics.metrics.abandonedCount": "{abandoned} sesiones sin completar",
    "analytics.metrics.globalAverage": "Puntaje global promedio",
    "analytics.metrics.competencyAverage": "Promedio de competencias",
    "analytics.traffic.eyebrow": "Distribución de niveles",
    "analytics.traffic.title": "Semáforo de literacidad",
    "analytics.traffic.completed": "{count} completadas",
    "analytics.traffic.stackAria": "Distribución proporcional de niveles",
    "analytics.traffic.sessionsUnit": "sesiones",
    "analytics.status.red.level": "Intervención prioritaria",
    "analytics.status.red.hint": "Nivel crítico",
    "analytics.status.red.tag": "Prioridad",
    "analytics.status.red.priority": "Prioridad alta",
    "analytics.status.yellow.level": "En refuerzo",
    "analytics.status.yellow.hint": "En desarrollo",
    "analytics.status.yellow.tag": "En refuerzo",
    "analytics.status.yellow.priority": "Refuerzo",
    "analytics.status.green.level": "Autónomo",
    "analytics.status.green.hint": "Competente",
    "analytics.status.green.tag": "Autónomo",
    "analytics.status.green.priority": "Seguimiento",
    "analytics.funnel.eyebrow": "Flujo de participación",
    "analytics.funnel.title": "Embudo de participación",
    "analytics.funnel.started": "Sesiones iniciadas",
    "analytics.funnel.completed": "Sesiones completadas",
    "analytics.funnel.abandoned": "Sesiones abandonadas",
    "analytics.competencies.eyebrow": "Competencias evaluadas",
    "analytics.competencies.title":
      "Resultados por competencia de literacidad",
    "analytics.competencies.colArea": "Área",
    "analytics.competencies.colCompetency": "Competencia",
    "analytics.competencies.colProgress": "Avance",
    "analytics.competencies.colScore": "Puntaje",
    "analytics.competencies.colStatus": "Estado",
    "analytics.competency.c1": "Señales visuales",
    "analytics.competency.c2": "Comprensión de lectura",
    "analytics.competency.c3": "Uso de íconos móviles",
    "analytics.competency.c4": "Ciberseguridad",
    "analytics.competency.status.priority": "Prioridad",
    "analytics.competency.status.reinforcement": "En refuerzo",
    "analytics.competency.status.stable": "Estable",
    "analytics.actionsPanel.eyebrow": "Acciones prioritarias",
    "analytics.actionsPanel.title": "Plan de acción recomendado",
    "analytics.actionsPanel.item1Title": "Priorizar {name} ({code})",
    "analytics.actionsPanel.item1Body":
      "Diseñar un taller focalizado porque es la competencia con menor avance relativo.",
    "analytics.actionsPanel.item2TitleOne":
      "Desplegar facilitadores en 1 zona de intervención prioritaria",
    "analytics.actionsPanel.item2TitleMany":
      "Desplegar facilitadores en {count} zonas de intervención prioritaria",
    "analytics.actionsPanel.item2TitleNone":
      "Desplegar facilitadores en las zonas de intervención prioritaria",
    "analytics.actionsPanel.item2Body":
      "Concentrar acompañamiento presencial donde el semáforo indica intervención prioritaria.",
    "analytics.actionsPanel.item3Title": "Reducir el abandono del {rate}%",
    "analytics.actionsPanel.item3Body":
      "Activar recordatorios y seguimiento temprano para recuperar sesiones incompletas.",
    "analytics.zones.eyebrow": "Zonas de intervención",
    "analytics.zones.title": "Desglose territorial",
    "analytics.zones.colZone": "Zona",
    "analytics.zones.colSessions": "Sesiones",
    "analytics.zones.colCompletion": "Finalización",
    "analytics.zones.colScore": "Puntaje",
    "analytics.zones.colStatus": "Estado",
    "analytics.zones.colPriority": "Prioridad",
    "analytics.map.eyebrow": "Cobertura territorial",
    "analytics.map.title": "Mapa de cobertura",
    "analytics.map.country": "Panamá",
    "analytics.map.popupStats": "{total} sesiones · {rate}% finalización",
    "analytics.map.popupStatus": "Estado: {status}",
    "intelligence.dashboardAria": "Panel de análisis e inteligencia",
    "intelligence.insights.aria":
      "Hallazgos prioritarios y recomendaciones",
    "intelligence.insights.eyebrow": "Resumen operativo",
    "intelligence.insights.title":
      "Hallazgos prioritarios y recomendaciones",
    "intelligence.insights.globalIndex": "Índice crítico global: {index}%",
    "intelligence.alert.empty":
      "Sin registros territoriales suficientes para estimar el índice de vulnerabilidad crítica.",
    "intelligence.alert.noCritical":
      "Sin sesiones críticas registradas en el corte actual. La zona con menor promedio relativo es {zone} ({score} / 9); se sugiere seguimiento preventivo.",
    "intelligence.alert.criticalLabel": "Atención prioritaria:",
    "intelligence.alert.criticalText":
      "La zona {zone} ({code}) tiene un índice crítico de {index}%. Se sugiere despliegue urgente de campaña educativa de Ciberseguridad.",
    "intelligence.kioskInsight.outlierTitle":
      "Variación detectada en punto de acceso",
    "intelligence.kioskInsight.topTitle":
      "Punto de acceso con mayor variación de resultados",
    "intelligence.kioskInsight.bodyPrefix":
      "Presenta una variación en Ciberseguridad (C4) de ",
    "intelligence.kioskInsight.bodyMiddle":
      ", con un rango común de respuestas entre ",
    "intelligence.kioskInsight.bodyRange": "{p25} y {p75} pts",
    "intelligence.kioskInsight.assistedRec":
      " Se recomienda activar modo asistido en este punto para nivelar brechas digitales.",
    "intelligence.c4Summary.title":
      "Consistencia general en Ciberseguridad (C4)",
    "intelligence.c4Summary.bodyPrefix": "Se detectaron ",
    "intelligence.c4Summary.bodySuffix":
      " punto(s) de acceso con diferencias marcadas en los resultados frente al promedio general ({avg} / 3.0 pts).",
    "intelligence.consistency.uniform": "Muy uniforme",
    "intelligence.consistency.consistent": "Consistente",
    "intelligence.consistency.highVariation": "Alta variación",
    "intelligence.zones.aria": "Ranking de vulnerabilidad por zona",
    "intelligence.zones.eyebrow": "Índice de vulnerabilidad territorial",
    "intelligence.zones.title": "Prioridad territorial por zona",
    "intelligence.zones.subtitle":
      "Clasificación según el porcentaje de participantes en nivel de apoyo prioritario (Rojo). La zona líder solo se resalta en rojo cuando existen sesiones en nivel crítico.",
    "intelligence.zones.countPill": "{count} zonas evaluadas",
    "intelligence.zones.colRank": "Rango",
    "intelligence.zones.colZone": "Zona",
    "intelligence.zones.colSessions": "Sesiones (Rojo / Amarillo / Verde)",
    "intelligence.zones.colAvgScore": "Puntaje promedio",
    "intelligence.zones.colCriticalIndex":
      "Índice crítico (% apoyo prioritario)",
    "intelligence.zones.tagPriority": "PRIORIDAD",
    "intelligence.zones.tagFollowUp": "SEGUIMIENTO",
    "intelligence.zones.codeLabel": "Código {code}",
    "intelligence.zones.breakdown":
      "(Rojo: {red} · Amarillo: {yellow} · Verde: {green})",
    "intelligence.kiosks.aria":
      "Desempeño y consistencia en Ciberseguridad por kiosco",
    "intelligence.kiosks.eyebrow": "Desempeño por punto de acceso",
    "intelligence.kiosks.title":
      "Resultados de Ciberseguridad (C4) por kiosco",
    "intelligence.kiosks.subtitle":
      "Puntaje promedio en Ciberseguridad, consistencia de respuestas y tiempo promedio de resolución en cada punto.",
    "intelligence.kiosks.avgPill":
      "Promedio en Ciberseguridad (C4): {avg} / 3",
    "intelligence.kiosks.colAccessPoint": "Punto de acceso",
    "intelligence.kiosks.colSessions": "Sesiones",
    "intelligence.kiosks.colAvgC4": "Promedio en Ciberseguridad (C4)",
    "intelligence.kiosks.colConsistency": "Consistencia de resultados",
    "intelligence.kiosks.colDuration": "Duración media",
    "intelligence.kiosks.colStatus": "Estado",
    "intelligence.kiosks.zoneChannel": "Zona {code}",
    "intelligence.kiosks.webChannel": "Canal Web",
    "intelligence.kiosks.variationLine":
      "Variación: ±{stddev} pts ({label})",
    "intelligence.kiosks.rangeLine":
      "Rango común de respuestas: {p25} a {p75} pts",
    "intelligence.kiosks.durationValue":
      "{avg} seg (variación de ±{stddev} seg)",
    "intelligence.kiosks.statusReview": "Revisar variación",
    "intelligence.kiosks.statusStable": "Estable",
    "admin.dashboard.loading": "Cargando estadísticas del panel…",
    "admin.dashboard.error":
      "No se pudieron cargar las estadísticas en vivo: {error}",
    "admin.dashboard.tryAgain": "Reintentar",
    "admin.dashboard.scope":
      "Las estadísticas incluyen únicamente evaluaciones completadas con resultados guardados.",
    "admin.dashboard.refresh": "Actualizar datos",
    "admin.dashboard.statsAria": "Estadísticas resumidas de evaluación",
    "admin.dashboard.totalSubmissions": "Envíos totales",
    "admin.dashboard.totalSubmissionsHelp":
      "Evaluaciones completadas con resultados guardados.",
    "admin.dashboard.averageScore": "Puntaje promedio",
    "admin.dashboard.averageScoreHelp":
      "Porcentaje promedio de aciertos, según el total de preguntas de cada evaluación.",
    "admin.dashboard.mostCommon": "Clasificación más común",
    "admin.dashboard.noData": "Sin datos",
    "admin.dashboard.noCompletedToClassify":
      "Aún no hay resultados completados para clasificar.",
    "admin.dashboard.completedCountOne": "1 evaluación completada.",
    "admin.dashboard.completedCountMany": "{count} evaluaciones completadas.",
    "admin.dashboard.distributionTitle": "Distribución por clasificación",
    "admin.dashboard.distributionSubtitle":
      "Conteos y porcentajes de evaluaciones completadas con resultados guardados.",
    "admin.dashboard.empty":
      "Aún no hay evaluaciones completadas disponibles.",
    "admin.dashboard.class.red": "Rojo (Apoyo prioritario)",
    "admin.dashboard.class.yellow": "Amarillo (En desarrollo)",
    "admin.dashboard.class.green": "Verde (Nivel sólido)",
    "admin.panel.eyebrow": "Administración",
    "admin.panel.title": "Panel Administrativo",
    "admin.panel.description":
      "Gestiona las evaluaciones y la analítica territorial desde un solo lugar.",
    "admin.panel.navAria": "Navegación de administración",
    "admin.panel.backLink": "Volver a la evaluación",
    "admin.panel.workspaceEyebrow": "Espacio de administración",
    "admin.panel.badgeLive": "Datos en vivo",
    "admin.panel.badgePreMl": "Motor Pre-ML",
    "admin.panel.badgeWorkspace": "Espacio admin",
    "admin.panel.placeholderNote":
      "Los datos del backend aún no están conectados en esta sección.",
    "admin.pages.dashboard.label": "Datos Generales",
    "admin.pages.dashboard.title": "Datos Generales · Dashboard",
    "admin.pages.dashboard.description":
      "Resumen general de actividad y resultados de evaluación.",
    "admin.pages.dashboard.placeholder":
      "Las tarjetas de resumen y la gráfica Rojo/Amarillo/Verde aparecerán aquí.",
    "admin.pages.intelligence.label": "Análisis Territorial",
    "admin.pages.intelligence.title":
      "Análisis territorial y por punto de acceso",
    "admin.pages.intelligence.description":
      "Prioridad territorial por zona, resultados en Ciberseguridad (C4) por kiosco y hallazgos operativos.",
    "admin.pages.results.label": "Resultados",
    "admin.pages.results.title": "Resultados de evaluación",
    "admin.pages.results.description":
      "Revisa los resultados de las evaluaciones en un solo lugar.",
    "admin.pages.results.placeholder":
      "La tabla de resultados y los filtros aparecerán aquí cuando estén disponibles.",
    "admin.pages.questions.label": "Preguntas",
    "admin.pages.questions.title": "Preguntas de evaluación",
    "admin.pages.questions.description":
      "Accede a la gestión de preguntas de la evaluación.",
    "admin.pages.questions.placeholder":
      "Las herramientas de gestión de preguntas aparecerán aquí cuando estén disponibles.",
  },
  en: {
    "app.title": "GBM CCLAS · Nina's Route",
    "language.group": "Language",
    "language.spanish": "Switch language to Spanish",
    "language.english": "Switch language to English",
    "qr.badge": "CREDENTIAL · QR",
    "qr.kicker": "Community Access Point · Smart Oasis",
    "qr.title": "Digital Entry Pass",
    "qr.summary":
      "Scan this code with your phone camera to start the assessment without needing an account or password.",
    "qr.canvasAria": "Access QR code for {url}",
    "qr.faultPrefix": "Unable to generate matrix: {message}",
    "qr.faultDefault": "Unable to synthesize matrix.",
    "qr.caption": "ISO/IEC 18004 Encoding · Level L",
    "qr.meta.rootLabel": "Root destination",
    "qr.meta.modeLabel": "Entry mode",
    "qr.meta.modeValue": "Zero keyboard · Anonymous (Law 81)",
    "qr.download": "Download PNG credential",
    "qr.networkHint":
      "Keep the phone and server on the same Wi-Fi network when operating in a local kiosk environment.",
    "analytics.gate.eyebrow": "Institutional access",
    "analytics.gate.title": "Analytics center",
    "analytics.gate.copy":
      "Access the community impact dashboard with your authorized PIN.",
    "analytics.gate.pinLabel": "Access PIN",
    "analytics.gate.pinError":
      "Incorrect PIN. Verify your credentials and try again.",
    "analytics.gate.unlock": "Unlock dashboard",
    "analytics.gate.backLink": "Back to assessment",
    "analytics.header.eyebrow": "CCLAS · TELEMETRY",
    "analytics.header.title": "Community impact",
    "analytics.tabs.aria": "Analytics center views",
    "analytics.tabs.general": "General summary",
    "analytics.tabs.territorial": "Territorial analysis",
    "analytics.source.live": "Connected data",
    "analytics.source.demo": "Demo data",
    "analytics.actions.simulate": "Simulate sample",
    "analytics.actions.simulateTitle":
      "Generate a simulated sample of 50 sessions",
    "analytics.actions.simulateAria": "Simulate sample of 50 sessions",
    "analytics.actions.restore": "Restore",
    "analytics.actions.restoreTitle": "Restore live data",
    "analytics.actions.restoreAria": "Restore live data",
    "analytics.actions.csvTitle": "Export data as CSV",
    "analytics.actions.csvAria": "Export CSV",
    "analytics.actions.jsonTitle": "Export data as JSON",
    "analytics.actions.jsonAria": "Export JSON",
    "analytics.actions.lock": "Lock",
    "analytics.actions.lockTitle": "Lock view",
    "analytics.actions.lockAria": "Lock view",
    "analytics.notice.syncing": "Syncing data…",
    "analytics.notice.offline": "Service unavailable: showing demo data.",
    "analytics.metrics.aria": "Key indicators",
    "analytics.metrics.totalSessions": "Total sessions",
    "analytics.metrics.cumulativeParticipation": "Cumulative participation",
    "analytics.metrics.completionRate": "Completion rate",
    "analytics.metrics.completedOfTotal": "{completed} of {total} sessions",
    "analytics.metrics.abandonmentRate": "Abandonment rate",
    "analytics.metrics.abandonedCount": "{abandoned} incomplete sessions",
    "analytics.metrics.globalAverage": "Average overall score",
    "analytics.metrics.competencyAverage": "Competency average",
    "analytics.traffic.eyebrow": "Level distribution",
    "analytics.traffic.title": "Literacy traffic light",
    "analytics.traffic.completed": "{count} completed",
    "analytics.traffic.stackAria": "Proportional distribution of levels",
    "analytics.traffic.sessionsUnit": "sessions",
    "analytics.status.red.level": "Priority intervention",
    "analytics.status.red.hint": "Critical level",
    "analytics.status.red.tag": "Priority",
    "analytics.status.red.priority": "High priority",
    "analytics.status.yellow.level": "Needs reinforcement",
    "analytics.status.yellow.hint": "Developing",
    "analytics.status.yellow.tag": "Reinforcement",
    "analytics.status.yellow.priority": "Reinforcement",
    "analytics.status.green.level": "Autonomous",
    "analytics.status.green.hint": "Proficient",
    "analytics.status.green.tag": "Autonomous",
    "analytics.status.green.priority": "Follow-up",
    "analytics.funnel.eyebrow": "Participation flow",
    "analytics.funnel.title": "Participation funnel",
    "analytics.funnel.started": "Started sessions",
    "analytics.funnel.completed": "Completed sessions",
    "analytics.funnel.abandoned": "Abandoned sessions",
    "analytics.competencies.eyebrow": "Assessed competencies",
    "analytics.competencies.title": "Results by literacy competency",
    "analytics.competencies.colArea": "Area",
    "analytics.competencies.colCompetency": "Competency",
    "analytics.competencies.colProgress": "Progress",
    "analytics.competencies.colScore": "Score",
    "analytics.competencies.colStatus": "Status",
    "analytics.competency.c1": "Visual signs",
    "analytics.competency.c2": "Reading comprehension",
    "analytics.competency.c3": "Mobile icon usage",
    "analytics.competency.c4": "Cybersecurity",
    "analytics.competency.status.priority": "Priority",
    "analytics.competency.status.reinforcement": "Reinforcement",
    "analytics.competency.status.stable": "Stable",
    "analytics.actionsPanel.eyebrow": "Priority actions",
    "analytics.actionsPanel.title": "Recommended action plan",
    "analytics.actionsPanel.item1Title": "Prioritize {name} ({code})",
    "analytics.actionsPanel.item1Body":
      "Design a focused workshop as this competency shows the lowest relative progress.",
    "analytics.actionsPanel.item2TitleOne":
      "Deploy facilitators in 1 priority intervention zone",
    "analytics.actionsPanel.item2TitleMany":
      "Deploy facilitators in {count} priority intervention zones",
    "analytics.actionsPanel.item2TitleNone":
      "Deploy facilitators in priority intervention zones",
    "analytics.actionsPanel.item2Body":
      "Focus in-person support where the traffic light indicates priority intervention.",
    "analytics.actionsPanel.item3Title":
      "Reduce the {rate}% abandonment rate",
    "analytics.actionsPanel.item3Body":
      "Enable reminders and early follow-up to recover incomplete sessions.",
    "analytics.zones.eyebrow": "Intervention zones",
    "analytics.zones.title": "Territorial breakdown",
    "analytics.zones.colZone": "Zone",
    "analytics.zones.colSessions": "Sessions",
    "analytics.zones.colCompletion": "Completion",
    "analytics.zones.colScore": "Score",
    "analytics.zones.colStatus": "Status",
    "analytics.zones.colPriority": "Priority",
    "analytics.map.eyebrow": "Territorial coverage",
    "analytics.map.title": "Coverage map",
    "analytics.map.country": "Panama",
    "analytics.map.popupStats": "{total} sessions · {rate}% completion",
    "analytics.map.popupStatus": "Status: {status}",
    "intelligence.dashboardAria": "Analysis and intelligence dashboard",
    "intelligence.insights.aria":
      "Priority findings and recommendations",
    "intelligence.insights.eyebrow": "Operational summary",
    "intelligence.insights.title":
      "Priority findings and recommendations",
    "intelligence.insights.globalIndex": "Global critical index: {index}%",
    "intelligence.alert.empty":
      "Insufficient territorial records to estimate the critical vulnerability index.",
    "intelligence.alert.noCritical":
      "No critical sessions recorded in the current period. The zone with the lowest relative average is {zone} ({score} / 9); preventive follow-up is recommended.",
    "intelligence.alert.criticalLabel": "Priority attention:",
    "intelligence.alert.criticalText":
      "Zone {zone} ({code}) has a critical index of {index}%. Urgent deployment of a Cybersecurity educational campaign is recommended.",
    "intelligence.kioskInsight.outlierTitle":
      "Variation detected at access point",
    "intelligence.kioskInsight.topTitle":
      "Access point with highest result variation",
    "intelligence.kioskInsight.bodyPrefix":
      "Shows a Cybersecurity (C4) variation of ",
    "intelligence.kioskInsight.bodyMiddle":
      ", with a common response range between ",
    "intelligence.kioskInsight.bodyRange": "{p25} and {p75} pts",
    "intelligence.kioskInsight.assistedRec":
      " Enabling assisted mode at this point is recommended to bridge digital gaps.",
    "intelligence.c4Summary.title":
      "Overall consistency in Cybersecurity (C4)",
    "intelligence.c4Summary.bodyPrefix": "Detected ",
    "intelligence.c4Summary.bodySuffix":
      " access point(s) with marked differences in results compared to the overall average ({avg} / 3.0 pts).",
    "intelligence.consistency.uniform": "Very uniform",
    "intelligence.consistency.consistent": "Consistent",
    "intelligence.consistency.highVariation": "High variation",
    "intelligence.zones.aria": "Zone vulnerability ranking",
    "intelligence.zones.eyebrow": "Territorial vulnerability index",
    "intelligence.zones.title": "Territorial priority by zone",
    "intelligence.zones.subtitle":
      "Ranked by the percentage of participants requiring priority support (Red). The leading zone is highlighted in red only when critical sessions exist.",
    "intelligence.zones.countPill": "{count} assessed zones",
    "intelligence.zones.colRank": "Rank",
    "intelligence.zones.colZone": "Zone",
    "intelligence.zones.colSessions": "Sessions (Red / Yellow / Green)",
    "intelligence.zones.colAvgScore": "Average score",
    "intelligence.zones.colCriticalIndex":
      "Critical index (% priority support)",
    "intelligence.zones.tagPriority": "PRIORITY",
    "intelligence.zones.tagFollowUp": "FOLLOW-UP",
    "intelligence.zones.codeLabel": "Code {code}",
    "intelligence.zones.breakdown":
      "(Red: {red} · Yellow: {yellow} · Green: {green})",
    "intelligence.kiosks.aria":
      "Cybersecurity performance and consistency by kiosk",
    "intelligence.kiosks.eyebrow": "Access point performance",
    "intelligence.kiosks.title": "Cybersecurity (C4) results by kiosk",
    "intelligence.kiosks.subtitle":
      "Average Cybersecurity score, response consistency, and average completion time at each access point.",
    "intelligence.kiosks.avgPill":
      "Cybersecurity (C4) average: {avg} / 3",
    "intelligence.kiosks.colAccessPoint": "Access point",
    "intelligence.kiosks.colSessions": "Sessions",
    "intelligence.kiosks.colAvgC4": "Cybersecurity (C4) average",
    "intelligence.kiosks.colConsistency": "Result consistency",
    "intelligence.kiosks.colDuration": "Average duration",
    "intelligence.kiosks.colStatus": "Status",
    "intelligence.kiosks.zoneChannel": "Zone {code}",
    "intelligence.kiosks.webChannel": "Web Channel",
    "intelligence.kiosks.variationLine":
      "Variation: ±{stddev} pts ({label})",
    "intelligence.kiosks.rangeLine":
      "Common response range: {p25} to {p75} pts",
    "intelligence.kiosks.durationValue":
      "{avg} sec (±{stddev} sec variation)",
    "intelligence.kiosks.statusReview": "Review variation",
    "intelligence.kiosks.statusStable": "Stable",
    "admin.dashboard.loading": "Loading dashboard statistics…",
    "admin.dashboard.error":
      "Could not load live dashboard statistics: {error}",
    "admin.dashboard.tryAgain": "Try again",
    "admin.dashboard.scope":
      "Statistics include completed assessments with saved results only.",
    "admin.dashboard.refresh": "Refresh data",
    "admin.dashboard.statsAria": "Assessment summary statistics",
    "admin.dashboard.totalSubmissions": "Total submissions",
    "admin.dashboard.totalSubmissionsHelp":
      "Completed assessments with saved results.",
    "admin.dashboard.averageScore": "Average score",
    "admin.dashboard.averageScoreHelp":
      "Mean percentage correct, based on each assessment’s question count.",
    "admin.dashboard.mostCommon": "Most common classification",
    "admin.dashboard.noData": "No data",
    "admin.dashboard.noCompletedToClassify":
      "No completed results to classify yet.",
    "admin.dashboard.completedCountOne": "1 completed assessment.",
    "admin.dashboard.completedCountMany": "{count} completed assessments.",
    "admin.dashboard.distributionTitle": "Classification distribution",
    "admin.dashboard.distributionSubtitle":
      "Counts and percentages of completed assessments with saved results.",
    "admin.dashboard.empty":
      "No completed assessments are available yet.",
    "admin.dashboard.class.red": "Red (Priority support)",
    "admin.dashboard.class.yellow": "Yellow (Developing)",
    "admin.dashboard.class.green": "Green (Solid level)",
    "admin.panel.eyebrow": "Administration",
    "admin.panel.title": "Admin Panel",
    "admin.panel.description":
      "Manage assessments and territorial analytics from one place.",
    "admin.panel.navAria": "Admin navigation",
    "admin.panel.backLink": "Back to assessment",
    "admin.panel.workspaceEyebrow": "Admin workspace",
    "admin.panel.badgeLive": "Live data",
    "admin.panel.badgePreMl": "Pre-ML Engine",
    "admin.panel.badgeWorkspace": "Admin workspace",
    "admin.panel.placeholderNote":
      "Backend data is not connected yet. No live records are displayed.",
    "admin.pages.dashboard.label": "General Data",
    "admin.pages.dashboard.title": "General Data · Dashboard",
    "admin.pages.dashboard.description":
      "General summary of assessment activity and results.",
    "admin.pages.dashboard.placeholder":
      "Dashboard cards and the Red/Yellow/Green chart will appear here.",
    "admin.pages.intelligence.label": "Territorial Analysis",
    "admin.pages.intelligence.title":
      "Territorial and access point analysis",
    "admin.pages.intelligence.description":
      "Territorial priority by zone, Cybersecurity (C4) results by kiosk, and operational findings.",
    "admin.pages.results.label": "Results",
    "admin.pages.results.title": "Assessment results",
    "admin.pages.results.description":
      "Review assessment results in one place.",
    "admin.pages.results.placeholder":
      "The results table and filters will appear here when available.",
    "admin.pages.questions.label": "Questions",
    "admin.pages.questions.title": "Assessment questions",
    "admin.pages.questions.description":
      "Access assessment question management.",
    "admin.pages.questions.placeholder":
      "Question management tools will appear here when available.",
  },
};

export function getSavedLanguage() {
  try {
    return localStorage.getItem(LANGUAGE_KEY) === "en" ? "en" : "es";
  } catch {
    return "es";
  }
}

export function translate(language, key, values = {}) {
  const lang = language === "en" ? "en" : "es";
  const globalMessages =
    typeof window !== "undefined" && window.MESSAGES ? window.MESSAGES : null;
  const template =
    globalMessages?.[lang]?.[key] ??
    FALLBACK_MESSAGES[lang]?.[key] ??
    globalMessages?.es?.[key] ??
    FALLBACK_MESSAGES.es?.[key] ??
    key;
  return String(template).replace(/\{(\w+)\}/g, (match, name) =>
    values[name] == null ? match : String(values[name]),
  );
}

export function applyLanguage(nextLanguage) {
  const normalized = nextLanguage === "en" ? "en" : "es";
  try {
    localStorage.setItem(LANGUAGE_KEY, normalized);
  } catch {
    // Ignore storage quota / private mode errors
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = normalized;
    document.title = translate(normalized, "app.title");
  }
  if (
    typeof window !== "undefined" &&
    typeof window.setLanguage === "function"
  ) {
    window.setLanguage(normalized);
  } else if (
    typeof window !== "undefined" &&
    typeof window.dispatchEvent === "function"
  ) {
    window.dispatchEvent(
      new CustomEvent(LANGUAGE_EVENT, { detail: { language: normalized } }),
    );
  }
  return normalized;
}

export function useI18n() {
  const [language, setLanguageState] = useState(getSavedLanguage);

  useEffect(() => {
    const syncFromRuntime = (event) => {
      if (event?.type === "storage" && event.key && event.key !== LANGUAGE_KEY) {
        return;
      }
      const next =
        event?.detail?.language === "en" || event?.detail?.language === "es"
          ? event.detail.language
          : getSavedLanguage();
      setLanguageState(next);
      if (typeof document !== "undefined") {
        document.documentElement.lang = next;
      }
    };

    window.addEventListener(LANGUAGE_EVENT, syncFromRuntime);
    window.addEventListener("storage", syncFromRuntime);
    return () => {
      window.removeEventListener(LANGUAGE_EVENT, syncFromRuntime);
      window.removeEventListener("storage", syncFromRuntime);
    };
  }, []);

  const changeLanguage = useCallback((nextLanguage) => {
    const updated = applyLanguage(nextLanguage);
    setLanguageState(updated);
    return updated;
  }, []);

  const t = useCallback(
    (key, values = {}) => translate(language, key, values),
    [language],
  );

  return { language, setLanguage: changeLanguage, t };
}

export function LanguageSelector({ className = "", variant = "dark" }) {
  const { language, setLanguage, t } = useI18n();

  return (
    <div
      className={`cclas-lang-selector ${variant === "light" ? "is-light" : ""} ${className}`.trim()}
      role="group"
      aria-label={t("language.group")}
    >
      <button
        type="button"
        data-language="es"
        aria-label={t("language.spanish")}
        aria-pressed={language === "es"}
        onClick={() => setLanguage("es")}
      >
        ES
      </button>
      <button
        type="button"
        data-language="en"
        aria-label={t("language.english")}
        aria-pressed={language === "en"}
        onClick={() => setLanguage("en")}
      >
        EN
      </button>
    </div>
  );
}
