document.getElementById('fileInput')
    .addEventListener('change', handle_file, false);

function handle_file(e) {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Always use the first sheet
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const headers = json[0];
        const task_name_idx = headers.indexOf("Task Name");
        if (task_name_idx === -1) {
            alert("No 'Task Name' column found!");
            return;
        }

        // Map each row into an object with dynamic properties
        const tasks = json.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, i) => {
                obj[header] = row[i] || "";
            });
            obj.level = Math.floor(
                (row[task_name_idx].match(/^(\s*)/)[0].length) / 3
            ) + 1;
            return obj;
        });

        const tree = build_tree(tasks, "Task Name");
        const tbody = document.querySelector('#scheduleContainer tbody');
        tbody.innerHTML = '';
        generate_table_rows(tree, tbody, headers, '');
        add_toggle_listeners();
    };

    reader.readAsArrayBuffer(file);
}

// Build tree from flat list
function build_tree(tasks, task_key) {
    const tree = [];
    const stack = [];

    tasks.forEach(task => {
        const node = {
            name: task[task_key].trim(),
            children: [],
            ...task  // keep all dynamic properties
        };

        while (stack.length && stack[stack.length - 1].level >= node.level) {
            stack.pop();
        }

        if (stack.length) {
            stack[stack.length - 1].children.push(node);
        } else {
            tree.push(node);
        }

        stack.push(node);
    });

    return tree;
}

// Generate table rows recursively, dynamically for all columns
function generate_table_rows(nodes, tbody, headers, parent_id='') {
    nodes.forEach((node, index) => {
        const row_id = parent_id ? `${parent_id}-${index}` : `${index}`;
        const tr = document.createElement('tr');
        tr.classList.add('task-row');
        tr.dataset.id = row_id;
        tr.dataset.parent = parent_id;

        // Task Name with indentation
        const td_name = document.createElement('td');
        td_name.style.paddingLeft = `${(node.level - 1) * 20}px`;
        td_name.innerHTML = node.children.length > 0
            ? `<span class="caret">${node["Task Name"]}</span>`
            : node["Task Name"];
        tr.appendChild(td_name);

        // Add all other columns dynamically
        headers.forEach(header => {
            if (header !== "Task Name") {
                const td = document.createElement('td');
                td.textContent = node[header];
                tr.appendChild(td);
            }
        });

        tbody.appendChild(tr);

        // Recursively add children rows
        if (node.children.length > 0) {
            generate_table_rows(node.children, tbody, headers, row_id);
            node.children.forEach((_, child_index) => {
                const child_row = tbody.querySelector(
                    `tr[data-id='${row_id}-${child_index}']`
                );
                if (child_row) child_row.style.display = 'none';
            });
        }
    });
}

// Add click toggles
function add_toggle_listeners() {
    const togglers = document.querySelectorAll('.caret');
    togglers.forEach(toggler => {
        toggler.addEventListener('click', function() {
            const tr = this.closest('tr');
            const id = tr.dataset.id;
            const tbody = tr.parentElement;

            const child_rows = Array.from(
                tbody.querySelectorAll(`tr[data-parent='${id}']`)
            );
            child_rows.forEach(row => {
                if (row.style.display === 'none') {
                    row.style.display = 'table-row';
                } else {
                    hide_children_recursively(row, tbody);
                }
            });

            this.classList.toggle('caret-down');
        });
    });
}

function hide_children_recursively(tr, tbody) {
    const id = tr.dataset.id;
    tr.style.display = 'none';
    const children = Array.from(
        tbody.querySelectorAll(`tr[data-parent='${id}']`)
    );
    children.forEach(child => hide_children_recursively(child, tbody));
}
