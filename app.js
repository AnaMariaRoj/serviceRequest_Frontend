document.getElementById("examRequestForm").addEventListener("submit", async function(event) {
    event.preventDefault(); // Evita que el formulario se envíe de la forma tradicional

    // 1. Obtener los valores del formulario
    const name = document.getElementById("name").value;
    const identifierValue = document.getElementById("identifierValue").value;
    const selectedExam = document.getElementById("examType");
    // Separa el código LOINC y el nombre visible del examen
    const [examCode, examDisplay] = selectedExam.value.split("|"); 
    const notes = document.getElementById("notes").value;

    // Referencia al div de mensajes para dar feedback al usuario
    const messageDiv = document.getElementById("message");
    messageDiv.style.display = "none"; // Oculta mensajes anteriores al inicio de una nueva solicitud
    messageDiv.className = ""; // Limpia clases de estilo de mensajes anteriores (success/error)

    // 2. Construir el objeto FHIR ServiceRequest
    const serviceRequest = {
        resourceType: "ServiceRequest",
        status: "active", // Estado de la solicitud (puede ser 'draft', 'active', 'completed', etc.)
        intent: "order", // Indica que es una orden o solicitud de servicio
        code: { // El tipo específico de examen que se está solicitando (usando LOINC)
            coding: [
                {
                    system: "http://loinc.org", // Sistema de codificación LOINC
                    code: examCode, // Código del examen LOINC
                    display: examDisplay // Nombre legible del examen
                }
            ],
            text: examDisplay // Texto legible para el usuario
        },
        subject: { // Referencia al paciente que necesita el examen
            reference: `Patient/${identifierValue}`, // Asume que el paciente puede ser identificado por su documento
            display: name
        },
        authoredOn: new Date().toISOString(), // Fecha y hora en que se creó la solicitud
        note: [ // Notas adicionales del médico
            {
                text: notes
            }
        ],
        requester: { // Referencia al médico que solicita el examen
            reference: "Practitioner/MedicoQueSolicita", // **IMPORTANTE**: Reemplazar con el ID real del médico logueado.
            display: "Dr. Médico Solicitante" // Nombre del médico que hace la solicitud
        },
        identifier: [ // Un identificador único para esta solicitud de servicio
            {
                system: "https://hospital.com/serviceRequest", // Sistema de identificación de tu hospital para ServiceRequest
                value: self.crypto.randomUUID() // Genera un UUID aleatorio para asegurar unicidad
            }
        ]
    };

    try {
        // 3. Enviar la solicitud POST al backend
        // Asegúrate de que esta URL sea la correcta de tu backend desplegado en Render
        const response = await fetch("https://servicerequest-backend.onrender.com/serviceRequest", { 
            method: "POST",
            headers: {
                "Content-Type": "application/json" // Indica que el cuerpo de la solicitud es JSON
            },
            body: JSON.stringify(serviceRequest) // Convierte el objeto JavaScript a una cadena JSON
        });

        const result = await response.json(); // Parsea la respuesta JSON del servidor

        // 4. Manejo de la respuesta del servidor
        if (!response.ok) {
            // Si la respuesta HTTP no fue exitosa (ej. 4xx, 5xx), lanza un error
            let errorMessage = `Error ${response.status}: `;
            if (result && result.detail) {
                // Si FastAPI devuelve detalles de error, los incluimos
                if (typeof result.detail === 'string') {
                    errorMessage += result.detail;
                } else if (Array.isArray(result.detail)) {
                    // Si son errores de validación de FastAPI, mapeamos los mensajes
                    errorMessage += result.detail.map(err => `${err.loc.join('.')} - ${err.msg}`).join('; ');
                }
            } else {
                errorMessage += "Error desconocido del servidor. Revisa los logs del backend.";
            }
            throw new Error(errorMessage);
        }

        // Si la solicitud fue exitosa
        messageDiv.className = "success"; // Aplica estilo de éxito
        messageDiv.textContent = `¡Solicitud de examen agendada con éxito! ID de solicitud: ${result._id}`;
        messageDiv.style.display = "block"; // Muestra el mensaje
        
        // Opcional: Limpiar el formulario después de una solicitud exitosa
        document.getElementById("examRequestForm").reset();

    } catch (error) {
        // Manejo de errores de red o errores lanzados desde el bloque 'try'
        console.error("Error al agendar la solicitud de examen:", error);
        messageDiv.className = "error"; // Aplica estilo de error
        messageDiv.textContent = `Error al agendar la solicitud de examen: ${error.message}. Revisa la consola y los logs del backend.`;
        messageDiv.style.display = "block"; // Muestra el mensaje
    }
});