/* =========================================================
   SKATE TRACKER
   Student + Attendance + Payment Management
========================================================= */


/* DATABASE */

const STORAGE_KEY = "skate_tracker_data";


let database = loadDatabase();

let editingStudentId = null;


/* =========================================================
   DATABASE STRUCTURE
========================================================= */

function emptyDatabase() {

    return {

        students: [],

        payments: [],

        attendance: []

    };

}


function loadDatabase() {

    const saved =
        localStorage.getItem(STORAGE_KEY);

    if (!saved) {

        return emptyDatabase();

    }

    try {

        return JSON.parse(saved);

    } catch {

        return emptyDatabase();

    }

}


function saveDatabase() {

    localStorage.setItem(

        STORAGE_KEY,

        JSON.stringify(database)

    );

}


/* =========================================================
   HELPERS
========================================================= */

function id() {

    return Date.now().toString(36) +
        Math.random()
            .toString(36)
            .substring(2);

}


function today() {

    return new Date()
        .toISOString()
        .split("T")[0];

}


function money(value) {

    return Number(value || 0)
        .toLocaleString(
            "en-KE",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );

}


function escapeHTML(value) {

    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function studentName(studentId) {

    const student =
        database.students.find(
            student => student.id === studentId
        );

    return student
        ? student.name
        : "Unknown";

}


/* =========================================================
   NAVIGATION
========================================================= */

document
    .querySelectorAll(".nav")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(".nav")
                    .forEach(btn =>
                        btn.classList.remove("active")
                    );

                button.classList.add("active");

                showPage(
                    button.dataset.page
                );

            }
        );

    });


function showPage(page) {

    if (page === "dashboard") {

        renderDashboard();

    }

    else if (page === "students") {

        renderStudents();

    }

    else if (page === "payments") {

        renderPayments();

    }

    else if (page === "attendance") {

        renderAttendance();

    }

    else if (page === "reports") {

        renderReports();

    }

}


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {

    document.getElementById("pageTitle")
        .textContent = "Dashboard";

    document.getElementById("pageDescription")
        .textContent =
        "Student registration and payment management";


    document.getElementById("addButton")
        .textContent = "+ Add Student";


    document.getElementById("addButton")
        .onclick = openStudentModal;


    const activeStudents =
        database.students.filter(
            student =>
                student.status === "Active"
        ).length;


    const totalPayments =
        database.payments.reduce(
            (total, payment) =>
                total +
                Number(payment.amount || 0),
            0
        );


    const totalBilled =
        database.students.reduce(
            (total, student) =>
                total +
                Number(student.amountPayable || 0),
            0
        );


    const outstanding =
        calculateOutstanding();


    const dueSoon =
        database.students.filter(
            student => {

                if (!student.nextPaymentDue) {
                    return false;
                }

                return student.nextPaymentDue <=
                    getFutureDate(7);

            }
        ).length;


    document.getElementById("content")
        .innerHTML = `

        <div class="dashboard-grid">

            <div class="stat-card">

                <div class="stat-title">
                    Total Students
                </div>

                <div class="stat-number">
                    ${database.students.length}
                </div>

            </div>


            <div class="stat-card">

                <div class="stat-title">
                    Active Students
                </div>

                <div class="stat-number">
                    ${activeStudents}
                </div>

            </div>


            <div class="stat-card">

                <div class="stat-title">
                    Payments Received
                </div>

                <div class="stat-number">
                    KES ${money(totalPayments)}
                </div>

            </div>


            <div class="stat-card">

                <div class="stat-title">
                    Outstanding
                </div>

                <div class="stat-number">
                    KES ${money(outstanding)}
                </div>

            </div>

        </div>


        <div class="card">

            <h2>
                Payment Follow-up
            </h2>

            <p>
                ${dueSoon}
                student(s) have payments due within
                the next 7 days.
            </p>

        </div>


        <div class="card">

            <h2>
                Recent Students
            </h2>

            ${renderRecentStudents()}

        </div>

    `;

}


function renderRecentStudents() {

    const students =
        [...database.students]
            .reverse()
            .slice(0, 5);


    if (!students.length) {

        return `
            <p>No students registered yet.</p>
        `;

    }


    return `

        <div class="table-container">

            <table>

                <thead>

                    <tr>

                        <th>Student</th>

                        <th>Parent</th>

                        <th>Phone</th>

                        <th>Payment Term</th>

                        <th>Status</th>

                    </tr>

                </thead>

                <tbody>

                    ${students.map(student => `

                        <tr>

                            <td>
                                ${escapeHTML(student.name)}
                            </td>

                            <td>
                                ${escapeHTML(student.parentName)}
                            </td>

                            <td>
                                ${escapeHTML(student.phone)}
                            </td>

                            <td>
                                ${escapeHTML(student.paymentTerm)}
                            </td>

                            <td>

                                <span class="badge ${student.status.toLowerCase()}">

                                    ${student.status}

                                </span>

                            </td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>

    `;

}


/* =========================================================
   STUDENTS
========================================================= */

function renderStudents() {

    document.getElementById("pageTitle")
        .textContent = "Students";

    document.getElementById("pageDescription")
        .textContent =
        "Manage student and parent information";


    document.getElementById("addButton")
        .textContent = "+ Add Student";


    document.getElementById("addButton")
        .onclick = openStudentModal;


    document.getElementById("content")
        .innerHTML = `

        <div class="toolbar">

            <input
                class="search"
                id="studentSearch"
                placeholder="Search student, parent or phone..."
            >

            <button
                class="primary"
                onclick="openStudentModal()"
            >
                + Add Student
            </button>

        </div>


        <div id="studentsTable"></div>

    `;


    document
        .getElementById("studentSearch")
        .addEventListener(
            "input",
            renderStudentTable
        );


    renderStudentTable();

}


function renderStudentTable() {

    const search =
        document
            .getElementById("studentSearch")
            ?.value
            .toLowerCase() || "";


    const students =
        database.students.filter(
            student =>

                student.name
                    .toLowerCase()
                    .includes(search)

                ||

                student.parentName
                    .toLowerCase()
                    .includes(search)

                ||

                student.phone
                    .toLowerCase()
                    .includes(search)

        );


    const container =
        document.getElementById("studentsTable");


    if (!students.length) {

        container.innerHTML = `

            <div class="card">

                No students found.

            </div>

        `;

        return;

    }


    container.innerHTML = `

        <div class="table-container">

            <table>

                <thead>

                    <tr>

                        <th>Student</th>

                        <th>Parent / Guardian</th>

                        <th>Phone</th>

                        <th>Email</th>

                        <th>Payment Term</th>

                        <th>Amount</th>

                        <th>Next Due</th>

                        <th>Status</th>

                        <th>Actions</th>

                    </tr>

                </thead>


                <tbody>

                    ${students.map(student => `

                        <tr>

                            <td>
                                <strong>
                                    ${escapeHTML(student.name)}
                                </strong>
                            </td>

                            <td>
                                ${escapeHTML(student.parentName)}
                            </td>

                            <td>
                                ${escapeHTML(student.phone)}
                            </td>

                            <td>
                                ${escapeHTML(student.email)}
                            </td>

                            <td>
                                ${escapeHTML(student.paymentTerm)}
                            </td>

                            <td>
                                KES ${money(student.amountPayable)}
                            </td>

                            <td>
                                ${escapeHTML(student.nextPaymentDue)}
                            </td>

                            <td>

                                <span class="badge ${student.status.toLowerCase()}">

                                    ${student.status}

                                </span>

                            </td>

                            <td>

                                <button
                                    class="action-button edit"
                                    onclick="editStudent('${student.id}')"
                                >
                                    Edit
                                </button>

                                <button
                                    class="action-button pay"
                                    onclick="openPaymentModal('${student.id}')"
                                >
                                    Payment
                                </button>

                                <button
                                    class="action-button delete"
                                    onclick="deleteStudent('${student.id}')"
                                >
                                    Delete
                                </button>

                            </td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>

    `;

}


/* =========================================================
   ADD STUDENT
========================================================= */

function openStudentModal() {

    editingStudentId = null;


    document.getElementById("studentModalTitle")
        .textContent = "Add Student";


    document
        .getElementById("studentForm")
        .reset();


    document.getElementById("registrationDate")
        .value = today();


    document.getElementById("studentModal")
        .classList.remove("hidden");

}


/* =========================================================
   EDIT STUDENT
========================================================= */

function editStudent(id) {

    const student =
        database.students.find(
            item => item.id === id
        );


    if (!student) return;


    editingStudentId = id;


    document.getElementById("studentModalTitle")
        .textContent = "Edit Student";


    document.getElementById("studentId")
        .value = student.id;

    document.getElementById("studentName")
        .value = student.name || "";

    document.getElementById("studentNumber")
        .value = student.studentNumber || "";

    document.getElementById("dateOfBirth")
        .value = student.dateOfBirth || "";

    document.getElementById("registrationDate")
        .value = student.registrationDate || "";

    document.getElementById("level")
        .value = student.level || "";

    document.getElementById("studentStatus")
        .value = student.status || "Active";

    document.getElementById("parentName")
        .value = student.parentName || "";

    document.getElementById("parentName2")
        .value = student.parentName2 || "";

    document.getElementById("phone")
        .value = student.phone || "";

    document.getElementById("email")
        .value = student.email || "";

    document.getElementById("emergencyContact")
        .value = student.emergencyContact || "";

    document.getElementById("emergencyPhone")
        .value = student.emergencyPhone || "";

    document.getElementById("coach")
        .value = student.coach || "";

    document.getElementById("trainingDay")
        .value = student.trainingDay || "";

    document.getElementById("trainingTime")
        .value = student.trainingTime || "";

    document.getElementById("studentNotes")
        .value = student.notes || "";

    document.getElementById("paymentTerm")
        .value = student.paymentTerm || "";

    document.getElementById("amountPayable")
        .value = student.amountPayable || "";

    document.getElementById("nextPaymentDue")
        .value = student.nextPaymentDue || "";


    document.getElementById("studentModal")
        .classList.remove("hidden");

}


/* =========================================================
   SAVE STUDENT
========================================================= */

document
    .getElementById("studentForm")
    .addEventListener(
        "submit",
        function(event) {

            event.preventDefault();


            const student = {

                name:
                    document.getElementById("studentName").value.trim(),

                studentNumber:
                    document.getElementById("studentNumber").value.trim(),

                dateOfBirth:
                    document.getElementById("dateOfBirth").value,

                registrationDate:
                    document.getElementById("registrationDate").value,

                level:
                    document.getElementById("level").value.trim(),

                status:
                    document.getElementById("studentStatus").value,

                parentName:
                    document.getElementById("parentName").value.trim(),

                parentName2:
                    document.getElementById("parentName2").value.trim(),

                phone:
                    document.getElementById("phone").value.trim(),

                email:
                    document.getElementById("email").value.trim(),

                emergencyContact:
                    document.getElementById("emergencyContact").value.trim(),

                emergencyPhone:
                    document.getElementById("emergencyPhone").value.trim(),

                coach:
                    document.getElementById("coach").value.trim(),

                trainingDay:
                    document.getElementById("trainingDay").value.trim(),

                trainingTime:
                    document.getElementById("trainingTime").value,

                notes:
                    document.getElementById("studentNotes").value.trim(),

                paymentTerm:
                    document.getElementById("paymentTerm").value,

                amountPayable:
                    Number(
                        document.getElementById("amountPayable").value || 0
                    ),

                nextPaymentDue:
                    document.getElementById("nextPaymentDue").value

            };


            if (editingStudentId) {

                const index =
                    database.students.findIndex(
                        student =>
                            student.id === editingStudentId
                    );


                database.students[index] = {

                    ...database.students[index],

                    ...student

                };

            }

            else {

                database.students.push({

                    id: id(),

                    ...student

                });

            }


            saveDatabase();

            closeStudentModal();

            renderStudents();

        }
    );


/* =========================================================
   DELETE STUDENT
========================================================= */

function deleteStudent(id) {

    if (
        !confirm(
            "Delete this student and their record?"
        )
    ) {
        return;
    }


    database.students =
        database.students.filter(
            student =>
                student.id !== id
        );


    database.payments =
        database.payments.filter(
            payment =>
                payment.studentId !== id
        );


    database.attendance =
        database.attendance.filter(
            attendance =>
                attendance.studentId !== id
        );


    saveDatabase();

    renderStudents();

}


/* =========================================================
   CLOSE STUDENT MODAL
========================================================= */

function closeStudentModal() {

    document
        .getElementById("studentModal")
        .classList.add("hidden");

}


/* =========================================================
   PAYMENTS
========================================================= */

function renderPayments() {

    document.getElementById("pageTitle")
        .textContent = "Payments";

    document.getElementById("pageDescription")
        .textContent =
        "Record and monitor student payments";


    document.getElementById("addButton")
        .textContent = "+ Record Payment";


    document.getElementById("addButton")
        .onclick = () =>
            openPaymentModal();


    const total =
        database.payments.reduce(
            (sum, payment) =>
                sum + Number(payment.amount || 0),
            0
        );


    document.getElementById("content")
        .innerHTML = `

        <div class="dashboard-grid">

            <div class="stat-card">

                <div class="stat-title">
                    Total Payments
                </div>

                <div class="stat-number">
                    KES ${money(total)}
                </div>

            </div>

            <div class="stat-card">

                <div class="stat-title">
                    Transactions
                </div>

                <div class="stat-number">
                    ${database.payments.length}
                </div>

            </div>

            <div class="stat-card">

                <div class="stat-title">
                    Outstanding
                </div>

                <div class="stat-number">
                    KES ${money(calculateOutstanding())}
                </div>

            </div>

        </div>


        <div class="card">

            <h2>Payment History</h2>

            <br>

            <div class="table-container">

                <table>

                    <thead>

                        <tr>

                            <th>Date</th>
                            <th>Student</th>
                            <th>Amount</th>
                            <th>Method</th>
                            <th>Reference</th>
                            <th>Payment Term</th>

                        </tr>

                    </thead>

                    <tbody>

                        ${database.payments.length

                            ?

                            database.payments
                                .slice()
                                .reverse()
                                .map(payment => {

                                    const student =
                                        database.students.find(
                                            s =>
                                                s.id === payment.studentId
                                        );


                                    return `

                                    <tr>

                                        <td>
                                            ${payment.date}
                                        </td>

                                        <td>
                                            ${escapeHTML(
                                                student?.name || "Unknown"
                                            )}
                                        </td>

                                        <td>
                                            KES ${money(payment.amount)}
                                        </td>

                                        <td>
                                            ${payment.method}
                                        </td>

                                        <td>
                                            ${escapeHTML(payment.reference)}
                                        </td>

                                        <td>
                                            ${student?.paymentTerm || ""}
                                        </td>

                                    </tr>

                                    `;

                                })
                                .join("")

                            :

                            `

                            <tr>

                                <td colspan="6">
                                    No payments recorded.
                                </td>

                            </tr>

                            `

                        }

                    </tbody>

                </table>

            </div>

        </div>

    `;

}


/* =========================================================
   PAYMENT MODAL
========================================================= */

function openPaymentModal(studentId = "") {

    const select =
        document.getElementById("paymentStudent");


    select.innerHTML = `

        <option value="">
            Select student
        </option>

        ${database.students
            .filter(s => s.status === "Active")
            .map(student => `

                <option
                    value="${student.id}"
                    ${student.id === studentId ? "selected" : ""}
                >

                    ${escapeHTML(student.name)}

                </option>

            `)
            .join("")}

    `;


    document.getElementById("paymentDate")
        .value = today();


    document.getElementById("paymentForm")
        .reset();


    if (studentId) {

        select.value = studentId;

    }


    document.getElementById("paymentDate")
        .value = today();


    document.getElementById("paymentModal")
        .classList.remove("hidden");

}


function closePaymentModal() {

    document
        .getElementById("paymentModal")
        .classList.add("hidden");

}


/* =========================================================
   SAVE PAYMENT
========================================================= */

document
    .getElementById("paymentForm")
    .addEventListener(
        "submit",
        function(event) {

            event.preventDefault();


            const payment = {

                id: id(),

                studentId:
                    document.getElementById("paymentStudent").value,

                date:
                    document.getElementById("paymentDate").value,

                amount:
                    Number(
                        document.getElementById("paymentAmount").value
                    ),

                method:
                    document.getElementById("paymentMethod").value,

                reference:
                    document.getElementById("paymentReference").value.trim(),

                notes:
                    document.getElementById("paymentNotes").value.trim()

            };


            database.payments.push(payment);


            const student =
                database.students.find(
                    student =>
                        student.id === payment.studentId
                );


            if (student) {

                student.nextPaymentDue =
                    calculateNextPaymentDate(
                        student.paymentTerm,
                        payment.date
                    );

            }


            saveDatabase();

            closePaymentModal();

            renderPayments();

        }
    );


/* =========================================================
   NEXT PAYMENT DATE
========================================================= */

function calculateNextPaymentDate(term, date) {

    const next =
        new Date(date + "T00:00:00");


    if (term === "Weekly") {

        next.setDate(
            next.getDate() + 7
        );

    }

    else if (term === "Bi-weekly") {

        next.setDate(
            next.getDate() + 14
        );

    }

    else if (term === "Monthly") {

        next.setMonth(
            next.getMonth() + 1
        );

    }


    return next
        .toISOString()
        .split("T")[0];

}


/* =========================================================
   OUTSTANDING
========================================================= */

function calculateOutstanding() {

    let outstanding = 0;


    database.students
        .forEach(student => {

            const paid =
                database.payments
                    .filter(
                        payment =>
                            payment.studentId === student.id
                    )
                    .reduce(
                        (sum, payment) =>
                            sum +
                            Number(payment.amount || 0),
                        0
                    );


            outstanding +=
                Math.max(
                    Number(student.amountPayable || 0) -
                    paid,
                    0
                );

        });


    return outstanding;

}


/* =========================================================
   ATTENDANCE
========================================================= */

function renderAttendance() {

    document.getElementById("pageTitle")
        .textContent = "Attendance";

    document.getElementById("pageDescription")
        .textContent =
        "Record student attendance";


    document.getElementById("addButton")
        .textContent = "+ Record Attendance";


    document.getElementById("addButton")
        .onclick = openAttendanceModal;


    document.getElementById("content")
        .innerHTML = `

        <div class="card">

            <h2>Attendance History</h2>

            <br>

            <div class="table-container">

                <table>

                    <thead>

                        <tr>

                            <th>Date</th>

                            <th>Student</th>

                            <th>Status</th>

                            <th>Notes</th>

                        </tr>

                    </thead>

                    <tbody>

                        ${database.attendance.length

                            ?

                            database.attendance
                                .slice()
                                .reverse()
                                .map(record => `

                                    <tr>

                                        <td>
                                            ${record.date}
                                        </td>

                                        <td>
                                            ${escapeHTML(
                                                studentName(
                                                    record.studentId
                                                )
                                            )}
                                        </td>

                                        <td>

                                            <span class="badge ${record.status.toLowerCase()}">

                                                ${record.status}

                                            </span>

                                        </td>

                                        <td>
                                            ${escapeHTML(record.notes)}
                                        </td>

                                    </tr>

                                `)
                                .join("")

                            :

                            `

                            <tr>

                                <td colspan="4">
                                    No attendance records.
                                </td>

                            </tr>

                            `

                        }

                    </tbody>

                </table>

            </div>

        </div>

    `;

}


/* =========================================================
   ATTENDANCE MODAL
========================================================= */

function openAttendanceModal() {

    const select =
        document.getElementById(
            "attendanceStudent"
        );


    select.innerHTML = `

        <option value="">
            Select student
        </option>

        ${database.students
            .filter(
                student =>
                    student.status === "Active"
            )
            .map(
                student => `

                    <option value="${student.id}">

                        ${escapeHTML(student.name)}

                    </option>

                `
            )
            .join("")}

    `;


    document.getElementById("attendanceDate")
        .value = today();


    document.getElementById("attendanceModal")
        .classList.remove("hidden");

}


function closeAttendanceModal() {

    document
        .getElementById("attendanceModal")
        .classList.add("hidden");

}


/* =========================================================
   SAVE ATTENDANCE
========================================================= */

document
    .getElementById("attendanceForm")
    .addEventListener(
        "submit",
        function(event) {

            event.preventDefault();


            database.attendance.push({

                id: id(),

                studentId:
                    document.getElementById(
                        "attendanceStudent"
                    ).value,

                date:
                    document.getElementById(
                        "attendanceDate"
                    ).value,

                status:
                    document.getElementById(
                        "attendanceStatus"
                    ).value,

                notes:
                    document.getElementById(
                        "attendanceNotes"
                    ).value.trim()

            });


            saveDatabase();

            closeAttendanceModal();

            renderAttendance();

        }
    );


/* =========================================================
   REPORTS
========================================================= */

function renderReports() {

    document.getElementById("pageTitle")
        .textContent = "Reports";

    document.getElementById("pageDescription")
        .textContent =
        "Student and payment reports";


    document.getElementById("addButton")
        .textContent = "Export Students";


    document.getElementById("addButton")
        .onclick = exportStudents;


    const active =
        database.students.filter(
            student =>
                student.status === "Active"
        ).length;


    const weekly =
        database.students.filter(
            student =>
                student.paymentTerm === "Weekly"
        ).length;


    const biweekly =
        database.students.filter(
            student =>
                student.paymentTerm === "Bi-weekly"
        ).length;


    const monthly =
        database.students.filter(
            student =>
                student.paymentTerm === "Monthly"
        ).length;


    document.getElementById("content")
        .innerHTML = `

        <div class="report-grid">

            <div class="report-box">

                <h3>
                    Active Students
                </h3>

                <strong>
                    ${active}
                </strong>

            </div>


            <div class="report-box">

                <h3>
                    Weekly
                </h3>

                <strong>
                    ${weekly}
                </strong>

            </div>


            <div class="report-box">

                <h3>
                    Bi-weekly
                </h3>

                <strong>
                    ${biweekly}
                </strong>

            </div>


            <div class="report-box">

                <h3>
                    Monthly
                </h3>

                <strong>
                    ${monthly}
                </strong>

            </div>


            <div class="report-box">

                <h3>
                    Payments Received
                </h3>

                <strong>
                    KES ${money(
                        database.payments.reduce(
                            (sum, payment) =>
                                sum +
                                Number(payment.amount || 0),
                            0
                        )
                    )}
                </strong>

            </div>


            <div class="report-box">

                <h3>
                    Outstanding
                </h3>

                <strong>
                    KES ${money(
                        calculateOutstanding()
                    )}
                </strong>

            </div>

        </div>


        <div class="card">

            <h2>
                Payment Due
            </h2>

            <br>

            <div class="table-container">

                <table>

                    <thead>

                        <tr>

                            <th>Student</th>

                            <th>Parent</th>

                            <th>Phone</th>

                            <th>Term</th>

                            <th>Next Payment</th>

                        </tr>

                    </thead>

                    <tbody>

                        ${database.students
                            .filter(
                                student =>
                                    student.nextPaymentDue
                            )
                            .sort(
                                (a, b) =>
                                    a.nextPaymentDue
                                        .localeCompare(
                                            b.nextPaymentDue
                                        )
                            )
                            .map(student => `

                                <tr>

                                    <td>
                                        ${escapeHTML(student.name)}
                                    </td>

                                    <td>
                                        ${escapeHTML(student.parentName)}
                                    </td>

                                    <td>
                                        ${escapeHTML(student.phone)}
                                    </td>

                                    <td>
                                        ${student.paymentTerm}
                                    </td>

                                    <td>
                                        ${student.nextPaymentDue}
                                    </td>

                                </tr>

                            `)
                            .join("")}

                    </tbody>

                </table>

            </div>

        </div>

    `;

}


/* =========================================================
   EXPORT STUDENTS
========================================================= */

function exportStudents() {

    if (!database.students.length) {

        alert("There are no students to export.");

        return;

    }


    const headers = [

        "Student Name",
        "Student ID",
        "Date of Birth",
        "Registration Date",
        "Level",
        "Status",
        "Parent Name",
        "Second Parent",
        "Phone",
        "Email",
        "Emergency Contact",
        "Emergency Phone",
        "Coach",
        "Training Day",
        "Training Time",
        "Payment Term",
        "Amount Payable",
        "Next Payment Due",
        "Notes"

    ];


    const rows =
        database.students.map(student => [

            student.name,
            student.studentNumber,
            student.dateOfBirth,
            student.registrationDate,
            student.level,
            student.status,
            student.parentName,
            student.parentName2,
            student.phone,
            student.email,
            student.emergencyContact,
            student.emergencyPhone,
            student.coach,
            student.trainingDay,
            student.trainingTime,
            student.paymentTerm,
            student.amountPayable,
            student.nextPaymentDue,
            student.notes

        ]);


    const csv = [

        headers,

        ...rows

    ]

        .map(
            row =>
                row
                    .map(
                        value =>
                            `"${String(value || "")
                                .replace(/"/g, '""')}"`
                    )
                    .join(",")
        )

        .join("\n");


    const blob =
        new Blob(
            [csv],
            {
                type: "text/csv"
            }
        );


    const url =
        URL.createObjectURL(blob);


    const link =
        document.createElement("a");


    link.href = url;

    link.download =
        "skate-students.csv";


    link.click();


    URL.revokeObjectURL(url);

}


/* =========================================================
   FUTURE DATE
========================================================= */

function getFutureDate(days) {

    const date =
        new Date();

    date.setDate(
        date.getDate() + days
    );

    return date
        .toISOString()
        .split("T")[0];

}
/* ADDED: whole section */
/* =========================================================
   PWA: SERVICE WORKER REGISTRATION
========================================================= */

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("sw.js")
            .catch(error => {
                console.warn("Service worker registration failed:", error);
            });
    });
}


/* ADDED: whole section */
/* =========================================================
   PWA: INSTALL PROMPT
========================================================= */

let deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    const installButton = document.getElementById("installButton");
    if (installButton) installButton.classList.remove("hidden");
});

document.getElementById("installButton")?.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    document.getElementById("installButton").classList.add("hidden");
});

window.addEventListener("appinstalled", () => {
    const installButton = document.getElementById("installButton");
    if (installButton) installButton.classList.add("hidden");
});


/* ADDED: whole section */
/* =========================================================
   PWA: OFFLINE / ONLINE BANNER
========================================================= */

function updateOfflineBanner() {
    const banner = document.getElementById("offlineBanner");
    if (!banner) return;
    if (navigator.onLine) banner.classList.add("hidden");
    else banner.classList.remove("hidden");
}

window.addEventListener("online", updateOfflineBanner);
window.addEventListener("offline", updateOfflineBanner);
updateOfflineBanner();



/* =========================================================
   START
========================================================= */

showPage("dashboard");
