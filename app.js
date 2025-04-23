document.getElementById("examRequestForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const name = document.getElementById("name").value;
    const identifierValue = document.getElementById("identifierValue").value;
    const examType = document.getElementById("examType").value;
    const notes = document.getElementById("notes").value;

    const serviceRequest = {
        resourceType: "ServiceRequest",
        status: "active",
        intent: "order",
        code: {
            coding: [
                {
                    system: "http://loinc.org",
                    code: examType,
                    display: examType
                }
            ],
            text: examType
        },
        subject: {
            reference: `Patient/${identifierValue}`,
            display: name
        },
        authoredOn: new Date().toISOString(),
        note: [
            {
                text: notes
            }
        ],
        requester: {
            reference: "Practitioner/12345",
            display: "Dr. Juan Pérez"
        },
        identifier: [
            {
                system: "https://hospital.com/serviceRequest",
                value: self.crypto.randomUUID()
            }
        ]
    };

    try {
        const response = await fetch("https://servicerequest-backend.onrender.com/servicerequest", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(serviceRequest)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${result.detail}`);
        }

        alert("Solicitud enviada con éxito. ID: " + result._id);
    } catch (error) {
        console.error("Error al enviar la solicitud:", error);
        alert("Error al enviar la solicitud: " + error.message);
    }
});
