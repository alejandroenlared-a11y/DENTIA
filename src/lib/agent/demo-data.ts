export const demoKnowledge = {
  clinic: {
    name: "Clinica Dental Murcia-Elche",
    assistant: "Clara",
    phone: "+34 968 000 111",
    locations: ["Murcia centro", "Elche - Altabix"],
    addresses: {
      "Murcia centro": "Paseo Duques de Lugo, 16, 30009 Murcia",
      "Elche - Altabix": "Carrer Reina Victoria, 49, 03201 Elche (Alicante)"
    },
    team: [
      { name: "Dr. Ernesto Ruiz Chumilla", specialty: "Periodoncia, implantes y cirugia oral" },
      { name: "Dra. Esther Estrada Mallada", specialty: "Ortodoncia" },
      { name: "Dra. Laura Herencia Lizaran", specialty: "Endodoncia y odontopediatria" },
      { name: "Dr. Manuel Ruiz Chumilla", specialty: "Estetica dental y conservadora" },
      { name: "Dra. Paula Garcia Garcia", specialty: "Odontopediatria" },
      { name: "Equipo de higienistas", specialty: "Higiene dental y mantenimiento periodontal" }
    ],
    hours: "Lunes a viernes, 9:30-14:00 y 16:00-20:00. Urgencias priorizadas el mismo dia."
  },
  treatments: [
    {
      name: "Primera visita y diagnostico digital",
      price: "0 EUR",
      about: "Revision completa con radiografia/escaner digital, diagnostico del doctor y plan de tratamiento con presupuesto, sin compromiso.",
      rule: "Sin coste, incluye orientacion y plan inicial."
    },
    {
      name: "Higiene dental",
      price: "55 EUR",
      about: "Limpieza profesional para eliminar placa y sarro; recomendada 1-2 veces al ano, o cada 3 meses si hay enfermedad periodontal.",
      rule: "45 minutos. Recordatorio automatico cada 6-12 meses."
    },
    {
      name: "Empaste / conservadora",
      price: "desde 65 EUR",
      about: "Elimina la caries y restaura la pieza con composite del color del diente; conserva la mayor parte del diente natural.",
      rule: "Requiere valorar caries, fractura o filtracion."
    },
    {
      name: "Endodoncia",
      price: "desde 220 EUR",
      about: "Trata la infeccion o inflamacion del nervio: limpia y sella el conducto para conservar la pieza sin necesidad de extraerla.",
      rule: "Dolor pulsatil, nocturno o sensibilidad persistente requiere valoracion."
    },
    {
      name: "Periodoncia",
      price: "desde 90 EUR",
      about: "Trata encias inflamadas (gingivitis) o con perdida de hueso (periodontitis); en casos avanzados requiere mantenimiento cada 3 meses.",
      rule: "Sangrado, movilidad o inflamacion de encias requiere sondaje periodontal."
    },
    {
      name: "Estetica dental",
      price: "valoracion sin coste",
      about: "Valoracion de sonrisa para elegir entre blanqueamiento, carillas, restauraciones esteticas de composite o Digital Smile Design segun color, forma, encia y mordida.",
      rule: "No reducir estetica dental a blanqueamiento; si el paciente pide opciones, explicar alternativas y proponer valoracion gratuita."
    },
    {
      name: "Blanqueamiento",
      price: "desde 280 EUR",
      about: "Aclara el color natural del diente en clinica o con ferulas para casa; antes se revisa sensibilidad y estado de las encias.",
      rule: "Requiere valorar sensibilidad y estado de encia."
    },
    {
      name: "Ortodoncia",
      price: "desde 1.800 EUR",
      about: "Alineadores transparentes removibles, brackets Damon o brackets esteticos segun edad, mordida y objetivos; requiere estudio digital previo.",
      rule: "No responder como si todo fuera Invisalign: si preguntan por brackets o aparato, explicar que se confirma la opcion adecuada en valoracion."
    },
    {
      name: "Implante unitario",
      price: "desde 1.200 EUR",
      about: "Raiz artificial de titanio que sustituye un diente perdido; requiere estudio de hueso (TAC/escaner 3D) antes de cerrar presupuesto.",
      rule: "No se cierra presupuesto sin TAC/valoracion."
    },
    {
      name: "Corona / protesis fija",
      price: "desde 450 EUR",
      about: "Cubre o sustituye una pieza danada o descementada para recuperar forma y funcion; se valora el estado del diente base antes de fabricarla.",
      rule: "Valorar munon, ajuste, fractura o descementado."
    },
    {
      name: "Extraccion muela del juicio",
      price: "desde 120 EUR",
      about: "Retira la muela cuando esta incluida, mal posicionada o causa infeccion/dolor de repeticion en la zona posterior.",
      rule: "Dolor posterior, inflamacion o dificultad al abrir requiere triaje."
    },
    {
      name: "Ferula de descarga",
      price: "desde 180 EUR",
      about: "Placa a medida para bruxismo o molestias de mandibula: protege los dientes del desgaste (se desgasta la ferula, no el diente) y alivia la tension muscular.",
      rule: "Bruxismo, dolor mandibular o desgaste requiere exploracion."
    },
    {
      name: "Urgencia dental",
      price: "desde 70 EUR",
      about: "Atencion prioritaria para dolor agudo, inflamacion o traumatismo; el tratamiento definitivo se decide tras la exploracion del doctor.",
      rule: "Dolor intenso, inflamacion o traumatismo se escala a humano."
    }
  ],
  financing: [
    "Financiacion hasta 24 meses segun importe y aprobacion.",
    "Presupuesto cerrado tras valoracion clinica.",
    "La IA puede orientar, pero no diagnosticar ni sustituir al odontologo."
  ],
  guardrails: [
    "No diagnostica sintomas.",
    "Escala dolor intenso, sangrado, inflamacion, traumatismos y reclamaciones.",
    "Pide consentimiento antes de guardar datos personales.",
    "Solo comunica precios cargados en catalogo o rangos autorizados."
  ]
};

export type DemoScenarioId = "first_visit" | "urgent_pain" | "implant_price" | "whitening" | "reactivation";

export type DemoScenario = {
  id: DemoScenarioId;
  title: string;
  intent: string;
  patientName: string;
  phone: string;
  prompt: string;
  reply: string;
  outcome: string;
  impact: string;
  treatmentNeed: string;
  estimatedValue: number;
  escalated: boolean;
};

export const demoScenarios: DemoScenario[] = [
  {
    id: "first_visit",
    title: "Primera visita",
    intent: "CITA_PRIMERA_VISITA",
    patientName: "Laura Paredes",
    phone: "+34 610 240 501",
    prompt: "Hola, soy de Elche y quiero pedir una primera visita para revisar una muela.",
    reply:
      "Hola Laura, soy Clara, recepcionista virtual de Clinica Dental Murcia-Elche. La primera visita con diagnostico digital es sin coste. Tenemos sede en Elche - Altabix; puedo proponerte un hueco manana a las 10:30 o por la tarde a las 17:45. Antes de guardar tus datos necesito tu consentimiento para tramitar la cita.",
    outcome: "Cita propuesta",
    impact: "Lead cualificado y cita creada por IA",
    treatmentNeed: "Primera visita y diagnostico digital",
    estimatedValue: 35000,
    escalated: false
  },
  {
    id: "urgent_pain",
    title: "Urgencia dental",
    intent: "URGENCIA_DOLOR_INFLAMACION",
    patientName: "Sergio Navarro",
    phone: "+34 611 240 502",
    prompt: "Me duele mucho una muela y tengo la cara algo inflamada desde ayer.",
    reply:
      "Sergio, por dolor intenso e inflamacion lo escalo ahora a recepcion para que te atienda una persona con prioridad. No puedo valorar sintomas ni diagnosticar, pero si puedo dejar registrada la urgencia y pedir que te llamen al +34 611 240 502. Si hay fiebre, sangrado abundante o empeora rapido, contacta directamente con la clinica.",
    outcome: "Urgencia escalada",
    impact: "Tarea critica creada para recepcion",
    treatmentNeed: "Urgencia dental",
    estimatedValue: 22000,
    escalated: true
  },
  {
    id: "implant_price",
    title: "Precio implante",
    intent: "PRECIO_IMPLANTE_FINANCIACION",
    patientName: "Ana Molina",
    phone: "+34 612 240 503",
    prompt: "Cuanto cuesta un implante? Me interesa saber si se puede financiar.",
    reply:
      "Ana, como orientacion autorizada, el implante unitario parte desde 1.200 EUR, pero el presupuesto exacto requiere valoracion y normalmente TAC. Podemos financiar hasta 24 meses segun importe y aprobacion. Te puedo reservar una primera valoracion gratuita en Murcia o Elche para darte un plan cerrado.",
    outcome: "Presupuesto orientado",
    impact: "Presupuesto de alto valor enviado a cita",
    treatmentNeed: "Implante unitario",
    estimatedValue: 120000,
    escalated: false
  },
  {
    id: "whitening",
    title: "Blanqueamiento",
    intent: "PRECIO_BLANQUEAMIENTO",
    patientName: "Marta Llorens",
    phone: "+34 613 240 504",
    prompt: "Quiero un blanqueamiento antes de una boda. Cuanto tardaria?",
    reply:
      "Marta, el blanqueamiento empieza desde 280 EUR, pero antes revisamos encia, sensibilidad y color inicial para hacerlo con seguridad. Si la boda es pronto, te propongo una valoracion esta semana y dejamos indicado el calendario recomendado por el doctor. Puedo reservarte en Murcia o Elche.",
    outcome: "Valoracion propuesta",
    impact: "Tratamiento estetico convertido en oportunidad",
    treatmentNeed: "Blanqueamiento",
    estimatedValue: 28000,
    escalated: false
  },
  {
    id: "reactivation",
    title: "Reactivar paciente",
    intent: "REACTIVACION_HIGIENE",
    patientName: "Carlos Vega",
    phone: "+34 614 240 505",
    prompt: "Hace bastante que no voy a una limpieza. Teneis algun hueco esta semana?",
    reply:
      "Carlos, veo que encaja una higiene dental de 45 minutos, precio orientativo 55 EUR. Esta semana hay hueco en Elche el jueves a las 12:00 y en Murcia el viernes a las 17:30. Si te va bien, te dejo pre-reserva y envio recordatorio automatico.",
    outcome: "Paciente reactivado",
    impact: "Recuperacion de paciente inactivo",
    treatmentNeed: "Higiene dental",
    estimatedValue: 5500,
    escalated: false
  }
];
