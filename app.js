const selectedExam = document.getElementById("examType");
const [examCode, examDisplay] = selectedExam.value.split("|");

const serviceRequest = {
    resourceType: "ServiceRequest",
    status: "active",
    intent: "order",
    code: {
        coding: [
            {
                system: "http://loinc.org",
                code: examCode,
                display: examDisplay
            }
        ],
        text: examDisplay
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

