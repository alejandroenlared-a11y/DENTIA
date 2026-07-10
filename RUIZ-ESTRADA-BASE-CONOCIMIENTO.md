# BASE DE CONOCIMIENTO — CLÍNICA DENTAL RUIZ ESTRADA

> **Propósito de este documento:** input estructurado para Claude Code. A partir de él debe poder: (1) generar un mapa completo de la empresa y (2) construir un agente IA recepcionista que conozca todos los tratamientos, trabajadores, sedes, políticas y protocolos de la clínica, oriente al paciente y agende citas.
> **Fuente:** extracción íntegra de https://clinicaruizestrada.com/ (8 julio 2026). Los datos marcados `[PENDIENTE CLIENTE]` no están publicados en la web y deben confirmarse con la clínica antes de activar el agente.

---

## 1. IDENTIDAD DE LA EMPRESA

| Campo | Valor |
|---|---|
| Nombre comercial | Clínica Dental Ruiz Estrada |
| Razón social | ERNESTRADENT CB |
| Claim | "Dentistas en Murcia" |
| Web | https://clinicaruizestrada.com |
| Email general | info@clinicaruizestrada.com |
| Redes | facebook.com/clinicaruizestrada · instagram.com/clinicaruizestrada |
| Sedes | 2 (Murcia y Elche) |
| Posicionamiento | Clínica familiar de alta tecnología: DSD, cirugía guiada, PRGF, sedación consciente, escáner iTero, CBCT, impresión 3D |
| Gancho comercial principal | **Primera visita a coste cero** (con escáner 3D + radiografía panorámica + diagnóstico + presupuesto sin compromiso) |
| Financiación | **Sin intereses hasta 24 meses** (100% del tratamiento). Efectivo, tarjeta, transferencia, domiciliación. Descuentos por pronto pago en ciertos tratamientos |

---

## 2. SEDES, HORARIOS Y CONTACTO

### 2.1. SEDE MURCIA

| Campo | Valor |
|---|---|
| Dirección | Paseo Duques de Lugo, 16, 30009 Murcia |
| Teléfono fijo | +34 968 299 036 |
| Móvil / WhatsApp | +34 601 365 969 |
| Email | info@clinicaruizestrada.com |
| Horario | Lun, Mié, Jue, Vie: 10:00–18:00 · Mar: 10:00–13:00 y 15:30–20:00 |
| Instalaciones | Varios gabinetes, sala de espera ergonómica, despacho de consultas, sala de esterilización, sala de rayos X digital (ortopantomografía y telerradiografía), recepción. Tour virtual en Google Street View |

### 2.2. SEDE ELCHE

| Campo | Valor |
|---|---|
| Dirección | Carrer Reina Victoria, 49, 03201 Elche (Alicante) |
| Teléfono fijo | +34 966 670 452 |
| Móvil / WhatsApp | +34 644 563 310 |
| Email | elche@clinicaruizestrada.com |
| Horario | Lun y Mié: 10:00–13:00 y 15:30–20:30 · Mar y Jue: 10:00–13:00 y 15:00–20:00 · Vie: 10:00–18:00 |
| Instalaciones | Recepción, varios gabinetes, sala de rayos X, sala de espera amplia y luminosa. Tour virtual en Street View |

### 2.3. REGLAS DE CALENDARIO GLOBALES

- **La clínica cierra durante el mes de agosto.** Solo se admiten peticiones de consulta a partir del 1 de septiembre. *(El agente debe conocer esto: en agosto, capturar el lead y agendar a partir de septiembre.)*
- Recomendación de la clínica: adultos, mínimo 2 revisiones al año.
- `[PENDIENTE CLIENTE]` Festivos locales, vacaciones parciales, huecos de urgencia diarios.

---

## 3. EQUIPO HUMANO

### 3.1. ODONTÓLOGOS

| Nombre | Especialidad | Notas |
|---|---|---|
| **Ernesto Ruiz Chumilla** | Periodoncia e Implantes | Socio fundador (la marca une los apellidos Ruiz + Estrada; empresa ERNESTRADENT) |
| **Esther Estrada Mallada** | Ortodoncia | Socia fundadora |
| **Laura Herencia Lizarán** | Endodoncia y Odontopediatría | — |
| **Manuel Ruiz Chumilla** | Estética Dental | — |
| **Paula García García** | Odontopediatría | — |

### 3.2. HIGIENISTAS BUCODENTALES

| Nombre |
|---|
| Ana Isabel García Marcos |
| Ana Alicia Prieto García |
| Bárbara Velasco Bernal |
| Dianet Rivas Varona |
| Virginia Vicente Torá |

`[PENDIENTE CLIENTE]` Números de colegiado, titulaciones, reparto de doctores por sede (Murcia vs Elche), días de consulta de cada doctor, personal de recepción.

### 3.3. MAPEO ESPECIALIDAD → DOCTOR (PARA ENRUTADO DE CITAS DEL AGENTE)

| Motivo del paciente | Doctor asignado |
|---|---|
| Implantes, encías, periodoncia, periimplantitis, cirugía | Ernesto Ruiz Chumilla |
| Ortodoncia (invisible, Damon, funcional), iTero | Esther Estrada Mallada |
| Endodoncia | Laura Herencia Lizarán |
| Niños / PADI | Laura Herencia Lizarán o Paula García García |
| Estética (carillas, blanqueamiento, DSD, prótesis) | Manuel Ruiz Chumilla |
| Higienes / mantenimiento periodontal | Equipo de higienistas |

---

## 4. CATÁLOGO COMPLETO DE TRATAMIENTOS

> Formato por tratamiento: descripción en lenguaje de paciente + datos clínicos que el agente puede usar. El agente NUNCA diagnostica; usa esto para orientar y agendar.

### 4.1. IMPLANTES DENTALES *(Dr. Ernesto Ruiz)*

- **Qué es:** raíz artificial de titanio (formas/superficies según paciente) que recupera masticación, habla y estética. Evita la pérdida de hueso y mantiene el volumen facial.
- **Opciones de restauración:** implante unitario · puente sobre 2 implantes · rehabilitación de varios dientes inferiores · prótesis completa superior · sobredentaduras.
- **Implante inmediato:** se coloca en la misma cirugía de la extracción; provisional que disimula el hueco durante la osteointegración.
- **Carga inmediata:** corona (provisional) el mismo día de la colocación del implante; definitiva tras cicatrización.
- **Cirugía guiada:** escaneado 3D + guía quirúrgica personalizada → posición, profundidad y angulación exactas; menos invasiva.
- **Elevación de seno maxilar:** cuando falta altura de hueso en maxilar superior posterior; se combina hueso sintético y autólogo antes del implante.
- **Implantes ultracortos Bicon:** sin tornillos (fijación por presión), mínimamente invasivos, gran resistencia, reducen acumulación de placa y riesgo de periimplantitis. Para casos con poco hueso.
- **Proceso general:** análisis clínico y radiológico (CBCT) → anestesia local → colocación → pilar → prótesis.
- **Complementos:** PRGF para acelerar cicatrización, sedación consciente disponible.

### 4.2. ESTÉTICA DENTAL *(Dr. Manuel Ruiz)*

- **Carillas de composite:** modeladas directamente en el diente, resultado en una sola cita.
- **Carillas cerámicas:** fabricadas en laboratorio, 2 citas; más brillo, no se tiñen, sin mantenimiento.
- **Coronas libres de metal.**
- **Incrustaciones (inlays/onlays):** restauraciones fabricadas fuera de boca (cerámica, composite o híbrido) con CAD-CAM y cementadas.
- **Prótesis:** parciales, completas y sobre implantes.
- **Blanqueamiento:** en clínica con sistema **Beyond Polus** ("Top Whitening System" mundial, fotoactivación con menos sensibilidad que láser) y ambulatorio con férulas personalizadas durante semanas.
- **Digital Smile Design (DSD):** fotos/vídeo → software → diseño digital de la sonrisa junto al paciente en tiempo real → previsualización del resultado ANTES de empezar. Indoloro.

### 4.3. ORTODONCIA *(Dra. Esther Estrada)*

- **Ortodoncia invisible (alineadores):** removible (comer y limpiar sin aparato), cubre ~95% de maloclusiones según colaboración; compensadores de erupción permiten empezar antes de que salgan todos los definitivos. Primera opción para adultos.
- **Brackets Damon (baja fricción, autoligado):** fuerzas más ligeras y biológicas; hasta **40% menos tiempo de tratamiento**; evita extracciones en ~95% de casos. Variantes: **Damon Q** (más resistente, jóvenes/deportistas) y **Damon Clear** (estético, no se tiñe).
- **Ortopedia funcional:** corrige maloclusiones de los huesos maxilares y guía el desarrollo facial; ideal entre los 3 y 12 años.
- **Por edades:** niños 6–10 (removibles/funcionales; brackets si apiñamiento severo) · adolescentes (Damon o alineadores) · adultos (alineadores primera opción, Damon Clear como alternativa discreta).
- **Escáner iTero Element:** registro digital sin pastas, simulación del resultado del tratamiento.

### 4.4. PERIODONCIA *(Dr. Ernesto Ruiz)*

- **Gingivitis:** inflamación por placa; limpieza profesional + educación en higiene + colutorios antibacterianos; el sangrado remite en 1–2 semanas con higiene diligente.
- **Periodontitis:** gingivitis avanzada con pérdida de hueso; limpieza completa, instrucción de cepillado/hilo, aplicaciones medicadas; casos severos → cirugía de bolsas.
- **Cirugía mucogingival (cirugía plástica de encía):** injertos para encía fina, frenectomías, cobertura de recesiones, preservación alveolar tras extracción, aumento de reborde.
- **Periimplantitis:** inflamación del tejido alrededor de implantes con pérdida de hueso. Factores de riesgo: mala higiene, tabaco, poca calidad ósea. Señales: molestia al masticar, inflamación, movilidad.
- **Mantenimiento:** pacientes periodontales → limpieza profesional **cada 3 meses** de por vida.

### 4.5. CIRUGÍA ORAL *(Dr. Ernesto Ruiz)*

- Extracciones (piezas y restos apicales) · **cordales (muelas del juicio)** · exposición y tracción de dientes incluidos · injertos de hueso y tejido blando · quistes y pequeños tumores · cirugía de frenillos · cirugía preprotésica.
- **PRGF (plasma rico en factores de crecimiento — sistema Endoret):** de la propia sangre del paciente; acelera regeneración ósea y de tejido blando, menos inflamación y molestias, mejor integración de implantes.
- **Regeneración ósea guiada (ROG):** relleno con hueso propio o biomaterial + membrana protectora; 4–6 meses de regeneración; hace viables implantes antes imposibles. Anestesia local, mínimamente invasiva.

### 4.6. ODONTOLOGÍA GENERAL / CONSERVADORA

- Restauradora (empastes/reconstrucciones), revisiones, higienes.
- **Endodoncia** *(Dra. Laura Herencia)*: elimina la pulpa afectada, desinfecta los conductos, los sella con materiales termoplásticos y resinas, y reconstruye el diente conservándolo. Uni y multirradicular.
- **Férulas de descarga (bruxismo/ATM):** placa de plástico a medida; elimina estrés neuromuscular, reposiciona mandíbula, protege los dientes (se desgasta la férula, no el diente). No evita apretar, pero alivia dolor mandibular, cefaleas y molestias de oído. Cuidado: limpieza semanal, ajustes profesionales cada ~6 meses.

### 4.7. MEDICINA BUCAL

- Diagnóstico y manejo de: herpes labial, aftas, candidiasis, **leucoplasia** (frecuente en fumadores — cribado relevante), xerostomía (boca seca), halitosis y lesiones de mucosa/lengua.

### 4.8. ODONTOPEDIATRÍA *(Dra. Laura Herencia · Dra. Paula García)*

- Traumatismos, selladores, tratamiento de caries, educación de hábitos, detección precoz de anomalías dentofaciales.
- **Primera visita recomendada: ~3 años**; revisiones cada 6 meses.
- Bebés: limpieza de dientes con gasa/cepillo blando, no biberón en la cama, pasta fluorada desde ~2 años bajo indicación.
- **PROGRAMA PADI (Región de Murcia — Servicio Murciano de Salud):** GRATUITO para niños de **6 a 8 años** (entran a los 6, salen al cumplir 9) con tarjeta sanitaria. Incluye: educación en salud, flúor, selladores en molares definitivos, empastes en molares definitivos, limpiezas, radiografías, extracciones, endodoncias en molares posteriores, reconstrucción de traumatismos en dientes anteriores. **NO incluye ortodoncia.** *(Solo aplica en la sede de Murcia; Elche pertenece a la Comunidad Valenciana `[PENDIENTE CLIENTE: equivalente valenciano]`.)*

### 4.9. SEDACIÓN CONSCIENTE CON ÓXIDO NITROSO *(transversal — diferenciador clave)*

- Gas incoloro de sabor dulce; efecto relajante y analgésico inmediato, recuperación rápida (el paciente sale por su propio pie).
- **Para quién:** miedo al dentista (odontofobia), niños, pacientes con condiciones psiquiátricas, reflejo de náusea acusado, épocas de estrés.
- **Ventajas:** sin agujas, sin entumecimiento residual, permite hacer más tratamiento por cita (reduce número de visitas).
- **Contraindicaciones:** pacientes que requieren oxígeno 100% o con presión intracraneal aumentada.
- Pocas clínicas lo ofrecen (equipamiento y formación caros) → argumento de venta.

---

## 5. TECNOLOGÍA (ARGUMENTARIO DEL AGENTE)

| Equipo | Para qué | Beneficio a comunicar |
|---|---|---|
| Escáner intraoral iTero Element | Ortodoncia, registros digitales | Sin pastas molestas; simula el resultado |
| CBCT dental | Planificación 3D de implantes | Máxima precisión de hueso disponible |
| Radiología panorámica + telerradiografía + intraoral RVG digital | Diagnóstico | Mínima radiación, imagen inmediata |
| Cámara intraoral HD | Diagnóstico visual | El paciente ve su boca en pantalla |
| DSD (Digital Smile Design) | Estética | Ver la sonrisa final antes de empezar |
| CAD-CAM + impresora 3D | Coronas, férulas, guías quirúrgicas | Precisión y rapidez |
| PRGF Endoret | Cirugía/implantes | Recuperación más rápida con tu propia sangre |
| Electrobisturí | Cirugía | Cortes que coagulan al instante, mejor postoperatorio |
| Sedación con óxido nitroso | Transversal | Adiós al miedo al dentista |
| Beyond Polus | Blanqueamiento | Sistema premiado, menos sensibilidad |

---

## 6. POLÍTICAS Y PROCESOS COMERCIALES

### 6.1. PRIMERA VISITA A COSTE CERO (FUNNEL DE ENTRADA)

Incluye SIEMPRE, sin compromiso: escáner intraoral 3D + radiografía panorámica + diagnóstico del odontólogo + plan de tratamiento con presupuesto e información de financiación.
*(El agente debe ofrecerla proactivamente a todo paciente nuevo.)*

### 6.2. PAGO Y FINANCIACIÓN

- Financiación **sin intereses hasta 24 meses** del 100% del tratamiento.
- Efectivo, tarjeta, transferencia, domiciliación bancaria mensual.
- Descuentos por pronto pago en determinados tratamientos `[PENDIENTE CLIENTE: cuáles y %]`.
- `[PENDIENTE CLIENTE]` Seguros/mutuas aceptados (Adeslas, Sanitas, DKV…): la web NO lo indica.

### 6.3. CANAL DE CITAS ACTUAL

- Formulario web (nombre, fecha deseada, mañana/tarde, sede, email, teléfono, motivo, RGPD) → **la clínica llama después para confirmar** (no hay agenda en tiempo real).
- Teléfono y WhatsApp por sede.
- `[PENDIENTE CLIENTE]` Software de gestión (PMS) que usan internamente — crítico para la integración del agente.

### 6.4. CONTENIDOS / MARKETING ACTIVO

- Blog activo (1–2 posts/mes; último: 19-jun-2026): ortodoncia Damon vs invisible, elevación de seno, sedación consciente, DSD, lesiones de lengua, carga inmediata, alimentación, estrés y salud dental, tabaco, piercings.
- Instagram y Facebook activos.

---

## 7. DATOS PENDIENTES DE CONFIRMAR CON EL CLIENTE (CHECKLIST ONBOARDING)

1. PMS utilizado (¿Gesden? ¿otro?) y acceso/API o conector local.
2. Precios orientativos por tratamiento y qué está autorizado a comunicar el agente.
3. Seguros y mutuas aceptados por sede.
4. Duración estándar de cita por tipo de tratamiento (primera visita, higiene, endodoncia…).
5. Reparto de doctores por sede y días de consulta de cada uno.
6. Huecos de urgencia: protocolo actual y disponibilidad diaria.
7. Números de colegiado y titulaciones (confianza + legal).
8. Equivalente al PADI en Comunidad Valenciana para la sede de Elche (programa GVA).
9. Política de cancelación y no-show.
10. Volumen actual: llamadas/día, citas/semana, % no-shows, % llamadas perdidas.

---

## 8. ESPECIFICACIÓN DEL AGENTE IA (INSTRUCCIONES PARA CLAUDE CODE)

### 8.1. ROL

Recepcionista virtual de Clínica Dental Ruiz Estrada. Atiende WhatsApp, web y teléfono 24/7 en español. Tono: cercano, cálido y profesional (clínica familiar, trato personal); tutea salvo que el paciente marque distancia. Se identifica como asistente virtual si se le pregunta.

### 8.2. TAREAS

1. **Agendar primera visita a coste cero** (funnel principal): capturar nombre, teléfono, sede preferida (Murcia/Elche), motivo, cómo nos conoció → proponer huecos según horarios de la sede → confirmar → recordatorios.
2. **Agendar/reprogramar/cancelar citas** de pacientes existentes.
3. **Orientar sobre tratamientos** usando el catálogo (sección 4) y el argumentario tecnológico (sección 5), en lenguaje llano. Vender los diferenciadores: primera visita gratis con escáner 3D y panorámica, sedación consciente, DSD, financiación 24 meses sin intereses.
4. **Triaje de urgencias:** dolor agudo/flemón/traumatismo → hueco prioritario o escalado inmediato a humano; fuera de horario → instrucciones básicas + primera cita disponible + derivación hospitalaria si es grave.
5. **PADI:** si el niño tiene 6–8 años y tarjeta sanitaria de Murcia → informar de que el programa es gratuito en la sede de Murcia y agendar.
6. **Escalado a humano:** urgencia real, queja, petición explícita, dudas clínicas fuera de guion, pagos. Entregar resumen + datos capturados al equipo de la sede correspondiente.

### 8.3. REGLAS DURAS

- Nunca diagnostica ni prescribe. Nunca da precios no autorizados (hoy: solo "primera visita gratuita" y "financiación hasta 24 meses sin intereses"; el resto → "el doctor te dará presupuesto exacto en la primera visita gratuita").
- Nunca confirma un hueco sin verificar disponibilidad en la agenda.
- Respeta el enrutado por especialidad (sección 3.3) y los horarios por sede (sección 2).
- Agosto: clínica cerrada → capturar lead y ofrecer primeras citas de septiembre.
- RGPD: consentimiento antes de guardar datos; mínimos datos de salud (motivo general).

### 8.4. ENTIDADES DEL MAPA DE EMPRESA (PARA GENERAR EL GRAFO)

```
EMPRESA (ERNESTRADENT CB / Clínica Ruiz Estrada)
├── SEDES [Murcia, Elche] → horarios, teléfonos, instalaciones
├── PERSONAS
│   ├── Odontólogos [5] → especialidad → tratamientos que realizan
│   └── Higienistas [5] → higienes, mantenimiento periodontal
├── ESPECIALIDADES [9] → TRATAMIENTOS [~35] → tecnología asociada
├── PROGRAMAS [Primera visita gratis, PADI Murcia, Financiación 24m]
├── CANALES [Teléfono x2, WhatsApp x2, Formulario web, Email x2, IG, FB, Blog]
└── PACIENTE → funnel: lead → primera visita → presupuesto → tratamiento → mantenimiento
```
