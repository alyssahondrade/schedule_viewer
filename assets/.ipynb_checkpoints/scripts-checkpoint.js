document.getElementById('fileInput').addEventListener('change', handleFile, false);

function handleFile(e) {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(
            data, { type: 'array' }
            );

        // Always use the first sheet
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(
            sheet, { header: 1 }
            );

        const headers = json[0];
        const task_name_idx = headers.indexOf("Task Name");
        if (task_name_idx === -1) {
            alert("No 'Task Name' column found!");
            return;
        }

        const tasks = json.slice(1).map(row => ({
            name: row[task_name_idx],
            level: Math.floor((row[task_name_idx].match(/^(\s*)/)[0].length)/3) + 1
        }));

        const tree = buildTree(tasks);
        document.getElementById('scheduleContainer').innerHTML = generateHTML(tree);
        addToggleListeners();
    };

    reader.readAsArrayBuffer(file);
}

// Build tree from flat list
function buildTree(tasks) {
    const tree = [];
    const stack = [];

    tasks.forEach(task => {
        const node = {
            name: task.name.trim(),
            children: [],
            level: task.level
        };

        while (stack.length && stack[stack.length-1].level >= task.level) {
            stack.pop();
        }
        if (stack.length) {
            stack[stack.length-1].children.push(node);
        } else {
            tree.push(node);
        }
        stack.push(node);
    });

    return tree;
}

// Generate nested HTML
function generateHTML(tree) {
    let html = '<ul>';
    tree.forEach(node => {
        html += `<li><span class="caret">${node.name}</span>`;
        if (node.children.length > 0) {
            html += '<ul class="nested">' + generateHTML(node.children) + '</ul>';
        }
        html += '</li>';
    });
    html += '</ul>';
    return html;
}

// Add click toggles
function addToggleListeners() {
    const toggler = document.getElementsByClassName("caret");
    for (let i=0; i<toggler.length; i++) {
        toggler[i].addEventListener("click", function() {
            const nested = this.parentElement.querySelector(".nested");
            if (nested) {
                nested.classList.toggle("active");
                this.classList.toggle("caret-down");
            }
        });
    }
}