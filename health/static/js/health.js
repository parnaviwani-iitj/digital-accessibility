document.addEventListener("DOMContentLoaded", () => {

    const $ = id => document.getElementById(id);

    const AVAILABLE_STATUSES = [
        "Verified",
        "Demo available"
    ];


    // =====================================
    // GENERAL HELPERS
    // =====================================

    function createElement(tag, text, className) {

        const element = document.createElement(tag);

        if (text !== undefined && text !== null) {
            element.textContent = text;
        }

        if (className) {
            element.className = className;
        }

        return element;
    }


    function setMessage(element, message) {
        element.textContent = message;
    }


    function isAvailable(value) {
        return AVAILABLE_STATUSES.includes(value);
    }


    // =====================================
    // COMMUNICATION SUPPORT
    // =====================================

    $("copyCommunication").addEventListener("click", async () => {

        const message = $("communicationText").value.trim();


        if (!message) {

            setMessage(
                $("communicationMessage"),
                "Please type a message before copying it."
            );

            return;

        }


        try {

            await navigator.clipboard.writeText(message);

            setMessage(
                $("communicationMessage"),
                "Your message has been copied."
            );

        } catch (error) {

            // Fallback for browsers where clipboard access is blocked.
            $("communicationText").select();

            const copied = document.execCommand("copy");

            setMessage(
                $("communicationMessage"),
                copied
                    ? "Your message has been copied."
                    : "Copy was not available. Please select and copy your message manually."
            );

        }

    });


    $("clearCommunication").addEventListener("click", () => {

        $("communicationText").value = "";

        setMessage(
            $("communicationMessage"),
            "Your message has been cleared."
        );

    });


    // =====================================
    // HOSPITAL DIRECTORY
    // =====================================

    let hospitals = [];


    const hospitalList = $("hospitalList");


    function getHospitalFilters() {

        return [
            ...document.querySelectorAll(
                'input[name="hospitalFilter"]:checked'
            )
        ].map(input => input.value);

    }


    function renderHospitals() {

        const query = $("hospitalSearch")
            .value
            .toLowerCase()
            .trim();


        const filters = getHospitalFilters();


        const results = hospitals.filter(hospital => {

            const searchable = [
                hospital.name,
                hospital.city,
                hospital.address,
                hospital.specialities
            ].join(" ").toLowerCase();


            const matchesSearch =
                searchable.includes(query);


            // Every selected filter must be available.
            // "Demo available" is included for testing.
            const matchesFilters = filters.every(filter =>
                isAvailable(hospital[filter])
            );


            return matchesSearch && matchesFilters;

        });


        hospitalList.replaceChildren();


        $("hospitalCount").textContent =
            `${results.length} matching hospital listing(s). ` +
            "Demo data is fictional and not real-world verification.";


        if (results.length === 0) {

            hospitalList.append(
                createElement(
                    "p",
                    "No hospitals match these filters. Try removing one or more filters."
                )
            );

            return;

        }


        const labels = {

            wheelchair_entrance: "Wheelchair entrance",

            ramps: "Ramps",

            elevators: "Elevators",

            accessible_toilet: "Accessible washroom",

            wheelchair_available: "Wheelchair availability",

            accessible_parking: "Accessible parking",

            sign_language: "Sign-language interpretation",

            written_communication: "Written communication",

            quiet_space: "Quiet waiting area",

            navigation_help: "Navigation assistance"

        };


        results.forEach(hospital => {

            const card = createElement(
                "article",
                "",
                "listing-card"
            );


            card.append(

                createElement("h3", hospital.name),

                createElement(
                    "p",
                    `Location: ${hospital.address}, ${hospital.city}`
                ),

                createElement(
                    "p",
                    `Specialities: ${hospital.specialities}`
                )

            );


            card.append(
                createElement(
                    "h4",
                    "Accessibility information"
                )
            );


            Object.entries(labels).forEach(([key, label]) => {

                const value = hospital[key] || "Not verified";

                const status = createElement(
                    "span",
                    `${label}: ${value}`,
                    "status"
                );


                if (value === "Verified") {
                    status.classList.add("verified");
                }

                if (value === "Demo available") {
                    status.classList.add("demo-available");
                }

                if (value === "Not available") {
                    status.classList.add("unavailable");
                }


                card.append(status);

            });


            card.append(
                createElement(
                    "p",
                    `Data status: ${hospital.last_verified}`
                ),

                createElement(
                    "p",
                    "This is fictional sample data. Contact a real facility to confirm its facilities before visiting."
                )

            );


            hospitalList.append(card);

        });

    }


    async function loadHospitals() {

        try {

            const response = await fetch("/health/api/hospitals");

            if (!response.ok) {
                throw new Error("Hospital data unavailable.");
            }


            hospitals = await response.json();


            renderHospitals();

        } catch (error) {

            hospitalList.textContent =
                "Hospital information could not be loaded. " +
                "Please check that the Flask server is running and the demo data has been generated.";

            console.error(error);

        } finally {

            hospitalList.setAttribute("aria-busy", "false");

        }

    }


    $("hospitalSearch").addEventListener(
        "input",
        renderHospitals
    );


    document.querySelectorAll(
        'input[name="hospitalFilter"]'
    ).forEach(input => {

        input.addEventListener(
            "change",
            renderHospitals
        );

    });


    $("clearHospitalFilters").addEventListener("click", () => {

        document.querySelectorAll(
            'input[name="hospitalFilter"]'
        ).forEach(input => {

            input.checked = false;

        });


        $("hospitalSearch").value = "";

        renderHospitals();

    });


    // =====================================
    // DOCTOR DIRECTORY
    // =====================================

    let doctors = [];


    const doctorList = $("doctorList");


    function renderDoctors() {

        const query = $("doctorSearch")
            .value
            .toLowerCase()
            .trim();


        const writtenOnly =
            $("doctorWrittenFilter").checked;

        const signOnly =
            $("doctorSignFilter").checked;

        const extraTimeOnly =
            $("doctorTimeFilter").checked;


        const results = doctors.filter(doctor => {

            const searchable = [
                doctor.name,
                doctor.speciality,
                doctor.hospital
            ].join(" ").toLowerCase();


            const matchesSearch =
                searchable.includes(query);


            const matchesWritten =
                !writtenOnly ||
                isAvailable(doctor.written_communication);


            const matchesSign =
                !signOnly ||
                isAvailable(doctor.sign_language);


            const matchesExtraTime =
                !extraTimeOnly ||
                isAvailable(doctor.extra_time);


            return (
                matchesSearch &&
                matchesWritten &&
                matchesSign &&
                matchesExtraTime
            );

        });


        doctorList.replaceChildren();


        $("doctorCount").textContent =
            `${results.length} matching doctor listing(s). ` +
            "Communication support shown here is fictional demonstration data.";


        if (results.length === 0) {

            doctorList.append(
                createElement(
                    "p",
                    "No doctors match these search options. Try removing one or more filters."
                )
            );

            return;

        }


        results.forEach(doctor => {

            const card = createElement(
                "article",
                "",
                "listing-card"
            );


            card.append(

                createElement("h3", doctor.name),

                createElement(
                    "p",
                    `Speciality: ${doctor.speciality}`
                ),

                createElement(
                    "p",
                    `Hospital: ${doctor.hospital}`
                ),

                createElement(
                    "p",
                    `Availability: ${doctor.availability}`
                ),

                createElement(
                    "p",
                    `Written communication: ${doctor.written_communication}`
                ),

                createElement(
                    "p",
                    `Sign-language support: ${doctor.sign_language}`
                ),

                createElement(
                    "p",
                    `Extra appointment time: ${doctor.extra_time}`
                )

            );


            doctorList.append(card);

        });

    }


    async function loadDoctors() {

        try {

            const response = await fetch("/health/api/doctors");

            if (!response.ok) {
                throw new Error("Doctor data unavailable.");
            }


            doctors = await response.json();


            renderDoctors();


            // Populate the appointment doctor selector.
            doctors.forEach(doctor => {

                const option = document.createElement("option");

                option.value = doctor.name;

                option.textContent =
                    `${doctor.name} — ${doctor.speciality}`;

                $("doctorSelect").append(option);

            });

        } catch (error) {

            doctorList.textContent =
                "Doctor information could not be loaded. " +
                "Please check that the Flask server is running and the demo data has been generated.";

            console.error(error);

        } finally {

            doctorList.setAttribute("aria-busy", "false");

        }

    }


    $("doctorSearch").addEventListener(
        "input",
        renderDoctors
    );


    [
        "doctorWrittenFilter",
        "doctorSignFilter",
        "doctorTimeFilter"
    ].forEach(id => {

        $(id).addEventListener(
            "change",
            renderDoctors
        );

    });


    // =====================================
    // APPOINTMENT FORM
    // =====================================

    const form = $("appointmentForm");


    const steps = [
        ...document.querySelectorAll(".form-step")
    ];


    let currentStep = 0;


    const backButton = $("previousStep");

    const nextButton = $("nextStep");

    const submitButton = $("submitAppointment");


    const dateInput = $("appointmentDate");


    function getLocalDate() {

        const now = new Date();

        return [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, "0"),
            String(now.getDate()).padStart(2, "0")
        ].join("-");

    }


    dateInput.min = getLocalDate();


    function showStep(index) {

        currentStep = index;


        steps.forEach((step, i) => {

            step.hidden = i !== index;

        });


        [1, 2, 3, 4].forEach((number, i) => {

            const label = $(`stepLabel${number}`);

            if (i === index) {

                label.setAttribute("aria-current", "step");

            } else {

                label.removeAttribute("aria-current");

            }

        });


        backButton.disabled = index === 0;

        nextButton.hidden = index === steps.length - 1;

        submitButton.hidden = index !== steps.length - 1;


        $("formError").textContent = "";


        if (index === 3) {
            updateReview();
        }


        steps[index].querySelector("h3").focus();

    }


    function validateCurrentStep() {

        const fields = [
            ...steps[currentStep].querySelectorAll(
                "input[required], select[required]"
            )
        ];


        for (const field of fields) {

            if (!field.checkValidity()) {

                field.reportValidity();

                field.focus();

                return false;

            }

        }


        return true;

    }


    function updateReview() {

        const review = $("reviewDetails");

        review.replaceChildren();


        const assistance = [
            ...document.querySelectorAll(
                'input[name="assistance"]:checked'
            )
        ].map(input => input.value);


        const details = [

            `Name: ${$("patientName").value}`,

            `Doctor: ${$("doctorSelect").value}`,

            `Date: ${dateInput.value}`,

            `Time: ${$("appointmentTime").selectedOptions[0]?.textContent || ""}`,

            `Assistance requested: ${
                assistance.length
                    ? assistance.join(", ")
                    : "None selected"
            }`,

            `Preferred communication: ${
                $("communicationMethod").value ||
                "No preference selected"
            }`

        ];


        details.forEach(detail => {

            review.append(
                createElement("p", detail)
            );

        });

    }


    nextButton.addEventListener("click", () => {

        if (!validateCurrentStep()) {
            return;
        }


        showStep(
            Math.min(currentStep + 1, steps.length - 1)
        );

    });


    backButton.addEventListener("click", () => {

        showStep(
            Math.max(currentStep - 1, 0)
        );

    });


    form.addEventListener("submit", async event => {

        event.preventDefault();


        if (currentStep !== steps.length - 1) {
            return;
        }


        const payload = {

            name: $("patientName").value.trim(),

            doctor: $("doctorSelect").value,

            date: dateInput.value,

            time: $("appointmentTime").value

        };


        submitButton.disabled = true;

        $("appointmentMessage").textContent =
            "Submitting demonstration request...";


        try {

            const response = await fetch(
                "/health/api/appointments",
                {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify(payload)

                }
            );


            const result = await response.json();


            if (!response.ok) {

                throw new Error(
                    result.message ||
                    "Request could not be submitted."
                );

            }


            $("appointmentMessage").textContent =
                result.message;


            form.reset();

            showStep(0);


        } catch (error) {

            $("formError").textContent =
                error.message ||
                "Something went wrong.";

        } finally {

            submitButton.disabled = false;

        }

    });


    // =====================================
    // INITIALISE
    // =====================================

    showStep(0);

    loadHospitals();

    loadDoctors();

});