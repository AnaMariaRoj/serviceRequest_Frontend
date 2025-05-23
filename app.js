// app.js del frontend (Corregido)

document.getElementById("examRequestForm").addEventListener("submit", async function(event) {
    event.preventDefault(); // Evita que el formulario se envíe de la forma tradicional

    // 1. Obtener los valores del formulario y limpiar espacios en blanco
    const name = document.getElementById("name").value.trim();
    const identifierValue = document.getElementById("identifierValue").value.trim();
    const selectedExamElement = document.getElementById("examType"); // Renombrado para mayor claridad
    const [examCode, examDisplay] = selectedExamElement.value.split("|"); // Separa el código LOINC y el nombre visible del examen
    const notes = document.getElementById("notes").value.trim();

    // Referencia al div de mensajes para dar feedback al usuario
    const messageDiv = document.getElementById("message");
    messageDiv.style.display = "none"; // Oculta mensajes anteriores al inicio de una nueva solicitud
    messageDiv.className = ""; // Limpia clases de estilo de mensajes anteriores (success/error)

    // **Validación básica en el frontend antes de enviar la solicitud**
    if (!name || !identifierValue || !examCode || !examDisplay) {
        messageDiv.className = "error";
        messageDiv.textContent = "Por favor, completa todos los campos obligatorios (Nombre, Documento, Tipo de Examen).";
        messageDiv.style.display = "block";
        return; // Detiene la ejecución si hay campos vacíos críticos
    }

    // 2. Construir el objeto FHIR ServiceRequest
    // Se recomienda seguir la estructura FHIR lo más posible.
    // Para el 'subject' (paciente), FHIR usa 'reference' (Patient/ID) o 'identifier'.
    // Si tu paciente aún no tiene un ID FHIR en tu sistema, puedes enviar el identificador
    // para que el backend lo busque o cree y luego asigne la referencia correcta.
    const serviceRequest = {
        resourceType: "ServiceRequest",
        status: "active", // 'active' es un estado común para una solicitud nueva
        intent: "order", // Indica que es una orden o solicitud de servicio
        code: { // El tipo específico de examen que se está solicitando (usando LOINC)
            coding: [
                {
                    system: "http://loinc.org", // Sistema de codificación LOINC
                    code: examCode, // Código del examen LOINC
                    display: examDisplay // Nombre legible del examen
                }
            ],
            // Opcional: Podrías añadir un texto legible para el código
            text: examDisplay
        },
        subject: { // Referencia al paciente que necesita el examen
            // **IMPORTANTE**: Aquí, la referencia es clave.
            // Si tu backend maneja recursos Patient separados, deberías
            // enviar una referencia al Patient real (e.g., Patient/ID_REAL_DEL_PACIENTE).
            // Para este ejemplo, estamos asumiendo que `identifierValue` será el
            // ID del paciente en la URL de referencia, y el backend lo manejará.
            // Una forma más robusta sería: el backend recibe `identifierValue` y `name`,
            // busca/crea el Patient, y luego usa el ID real de ese Patient para ServiceRequest.subject.reference.
            // Por ahora, lo mantenemos como lo tenías, pero el backend deberá ser flexible.
            reference: `Patient/${identifierValue}`, // Asume que el paciente puede ser identificado por su documento
            display: name
        },
        // **Añadir el identificador del paciente de manera más explícita (NO ESTÁNDAR FHIR EN SERVICEREQUEST DIRECTAMENTE)**
        // Este campo es un "hack" para pasar el identificador sin que FHIR lo valide directamente en ServiceRequest,
        // pero que tu backend pueda usarlo para buscar/crear el Patient.
        // En un sistema FHIR real, el backend buscaría el Patient por el 'identifierValue'
        // y luego llenaría el 'subject.reference' con el ID del Patient.
        patientIdentifier: { // Este es un campo auxiliar, no parte del modelo FHIR ServiceRequest
            system: "http://hospital.com/patient-identifiers", // Sistema de identificación de tu hospital para pacientes
            value: identifierValue
        },
        authoredOn: new Date().toISOString(), // Fecha y hora en que se creó la solicitud en formato ISO 8601
        note: notes ? [{ text: notes }] : [], // Notas adicionales del médico. Asegura que el array no sea vacío si no hay notas.
        requester: { // Referencia al médico que solicita el examen
            // **IMPORTANTE**: Reemplazar con el ID real del médico logueado.
            // En una aplicación real, el ID del médico provendría de la sesión de usuario.
            reference: "Practitioner/MedicoQueSolicita", // Ejemplo de referencia
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
        // Asegúrate de que esta URL sea la correcta de tu backend (local o desplegado)
        // Para local, usualmente es http://localhost:8000
        const backendUrl = "http://localhost:8000/servicerequest"; // URL para ejecución local
        // const backendUrl = "https://servicerequest-backend.onrender.com/servicerequest"; // Si lo tienes desplegado

        const response = await fetch(backendUrl, {
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
                    // Errores de validación de Pydantic/FastAPI
                    errorMessage += result.detail.map(err => {
                        const loc = err.loc ? err.loc.join('.') : 'unknown location';
                        return `${loc} - ${err.msg}`;
                    }).join('; ');
                } else {
                     errorMessage += JSON.stringify(result.detail); // En caso de que detail sea otro tipo de objeto
                }
            } else {
                errorMessage += "Error desconocido del servidor. Revisa los logs del backend.";
            }
            throw new Error(errorMessage);
        }

        // Si la solicitud fue exitosa
        messageDiv.className = "success"; // Aplica estilo de éxito
        // El backend ahora debería devolver el _id de MongoDB en la respuesta exitosa
        messageDiv.textContent = `¡Solicitud de examen agendada con éxito! ID de solicitud en DB: ${result._id}`;
        messageDiv.style.display = "block";

        // Opcional: Limpiar el formulario después de una solicitud exitosa
        document.getElementById("examRequestForm").reset();

    } catch (error) {
        // Manejo de errores de red o errores lanzados desde el bloque 'try'
        console.error("Error al agendar la solicitud de examen:", error);
        messageDiv.className = "error"; // Aplica estilo de error
        messageDiv.textContent = `Error al agendar la solicitud de examen: ${error.message}. Revisa la consola del navegador y los logs del backend.`;
        messageDiv.style.display = "block"; // Muestra el mensaje
    }
});