# Reglas UI DENTIA

## Norma de Verdad: Cards

- Ninguna card puede cortar informacion visible.
- Si una card no tiene espacio suficiente, debe crecer, reducir densidad de forma explicita o mover contenido sobrante a una accion clara como "Ver todo".
- No usar `overflow: hidden`, `max-height` o recortes visuales en cards para esconder filas, titulos, fechas, importes, pacientes o tareas.
- En dashboards sin scroll, se reduce el numero de items mostrados antes de cortar contenido.
- Las listas dentro de cards deben mostrar items completos. Una fila parcialmente visible se considera bug visual.
- El truncado con elipsis solo es aceptable para texto secundario largo en una sola linea cuando el dato completo esta disponible en una vista de detalle, tooltip o tabla dedicada.
- Antes de cerrar una pantalla, verificar que no hay textos solapados, filas partidas ni contenido oculto en cards en escritorio y movil.

## Norma de Verdad: Cancelar Creacion

- Todo flujo de alta, creacion o configuracion temporal debe tener una accion `Cancelar` visible.
- `Cancelar` nunca crea, guarda ni modifica datos.
- Al pulsar `Cancelar`, la UI debe salir del modo de creacion: cerrar modal/drawer, quitar el `#hash` activo o volver a la vista anterior estable.
- La `x`, el backdrop y el boton `Cancelar` de un modal/drawer deben ejecutar el mismo cierre funcional.
- No basta con que el boton parezca cancelable: debe verificarse en navegador.

## Norma de Verdad: Sedes

- El selector de sede (`Murcia` / `Elche`) no es decorativo: filtra el entorno completo.
- En la sede Murcia no deben aparecer pacientes, citas, gabinetes ni medicos exclusivos de Elche.
- En la sede Elche no deben aparecer pacientes, citas, gabinetes ni medicos exclusivos de Murcia.
- Un paciente pertenece por defecto a la sede donde se dio de alta.
- Un paciente puede aparecer en otra sede si tiene una cita/consulta solicitada o activa en esa sede.
- Un medico puede trabajar en Murcia, Elche o ambas sedes; esa disponibilidad debe vivir en la ficha del medico.
- Toda alta de paciente, cita o bloqueo de agenda debe persistir la sede activa.
