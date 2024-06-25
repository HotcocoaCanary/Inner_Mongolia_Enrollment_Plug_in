function fetchConfigJson() {
    return fetch(chrome.runtime.getURL('config.json')).then(response => response.json());
}

function initializeTable(configData, config) {
    const tbody = document.getElementById('data-table').getElementsByTagName('tbody')[0];
    tbody.innerHTML = '';

    for (const key in configData) {
        if (configData.hasOwnProperty(key)) {
            const item = configData[key];
            const row = tbody.insertRow();

            config.forEach(configItem => {
                const cell = row.insertCell();
                cell.innerText = item[configItem.id] || '';
            });

            const deleteCell = row.insertCell();
            const deleteButton = document.createElement('button');
            deleteButton.innerText = '删除';
            deleteButton.classList.add('delete-button');
            deleteButton.onclick = function () {
                delete configData[key];
                chrome.storage.local.set({ configData: configData }, function() {
                    if (chrome.runtime.lastError) {
                        console.error('Error saving to chrome.storage:', chrome.runtime.lastError);
                    }
                });
                init();
            };
            deleteCell.appendChild(deleteButton);
        }
    }
}
function init() {
    fetchConfigJson()
        .then(config => {
            const thead = document.getElementById('data-table').getElementsByTagName('thead')[0];
            thead.innerHTML = '';
            const headerRow = thead.insertRow();

            config.forEach(item => {
                const headerCell = headerRow.insertCell();
                headerCell.innerText = item.label;
            });

            const headerDeleteCell = headerRow.insertCell();
            headerDeleteCell.innerText = '操作';

            chrome.storage.local.get('configData', (data) => {
                if (chrome.runtime.lastError) {
                    console.error('Error reading from chrome.storage:', chrome.runtime.lastError);
                    return;
                }
                if (!data.configData) {
                    data.configData = {};
                }
                initializeTable(data.configData, config);
            });
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });
}

document.addEventListener('DOMContentLoaded', function() {
   init()

    // 为表格添加点击事件监听器，以便编辑单元格
    document.getElementById('data-table').addEventListener('click', function(event) {
        const target = event.target;
        if (target.tagName === 'TD') {
            editCell(target);
        }
    });
});

// 编辑单元格的函数
function editCell(cell) {
    // 创建一个文本框元素，用于编辑单元格内容
    const input = document.createElement('input');
    input.type = 'text';
    input.value = cell.textContent;

    // 替换单元格内容为文本框
    cell.textContent = '';
    cell.appendChild(input);

    // 当文本框失去焦点时保存数据
    input.addEventListener('blur', function() {
        cell.textContent = input.value;
    });

    // 当在文本框中按下回车键时也保存数据
    input.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            cell.textContent = input.value;
        }
    });

    // 将焦点设置到文本框上，以便立即可以编辑
    input.focus();
}
document.getElementById('saveValue').addEventListener('click', function() {
    fetchConfigJson()
        .then(templateConfig => {
            const table = document.getElementById('data-table');
            const rows = table.rows; // 获取所有行
            const configData = {};

            for (let i = 1; i < rows.length; i++) { // 跳过标题行，从索引1开始
                const cells = rows[i].cells; // 获取当前行的所有单元格
                const rowData = {};
                for (let j = 0; j < cells.length-1; j++) {
                    // 假设templateConfig的顺序与表格列的顺序相同
                    const property = templateConfig[j].id;
                    rowData[property] = cells[j].textContent.trim();
                }
                // 使用时间戳加上行索引作为键名
                const newZyKey = `${Date.now() + i}`;
                configData[newZyKey] = rowData;
            }

            // 读取Chrome浏览器的同步存储
            chrome.storage.local.get('configData', (data) => {
                if (chrome.runtime.lastError) {
                    console.error('Error reading from chrome.storage:', chrome.runtime.lastError);
                    return;
                }

                // 初始化configData对象，如果它不存在
                if (!data.configData) {
                    data.configData = {};
                }

                // 将新数据合并到configData对象中
                data.configData = configData;

                // 保存到Chrome浏览器的同步存储中
                chrome.storage.local.set(data, () => {
                    if (chrome.runtime.lastError) {
                        console.error('Error saving to chrome.storage:', chrome.runtime.lastError);
                        return;
                    }
                    init();
                });
            });
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });
});

// 选择按钮并添加点击事件监听器
document.getElementById('addValue').addEventListener('click', function() {
    // 假设您的表格ID是#yourTableId
    const table = document.getElementById('data-table');
    const firstRow = table.rows[1]; // 获取表格的第一行数据行（跳过标题行）

    // 创建新的行元素
    const newRow = table.insertRow(-1); // 在表格的末尾插入新行

    // 遍历第一行的所有单元格，以确定新行中单元格的数量
    for (let i = 0; i < firstRow.cells.length-1; i++) {
        // 创建新的单元格
        const newCell = newRow.insertCell(i);

        // 如果是第一或第二个单元格，设置其内容为第一行对应单元格的内容
        if (i === 0 || i === 1) {
            newCell.textContent = firstRow.cells[i].textContent;
        } else {
            // 否则，留空
            newCell.textContent = '';
        }
    }
});
