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
            makeCellEditable(target);
        }
    });
});

// 编辑单元格的函数
function makeCellEditable(cell) {
    // 设置单元格为可编辑
    cell.contentEditable = true;

    // 为防止用户在编辑时选择其他单元格，暂时禁用其他单元格的点击事件
    const allCells = document.querySelectorAll('#data-table td');
    allCells.forEach(c => {
        if (c !== cell) {
            c.addEventListener('click', preventEdit, true);
        }
    });

    // 将焦点设置到单元格上，以便立即可以编辑
    cell.focus();

    // 保存原始文本，以便在取消编辑时恢复
    const originalText = cell.textContent;

    // 当单元格失去焦点时保存数据
    cell.addEventListener('blur', function() {
        saveCellData(cell);
        cell.contentEditable = false; // 关闭编辑模式

        // 恢复其他单元格的点击事件
        allCells.forEach(c => {
            c.removeEventListener('click', preventEdit, true);
        });
    });

    // 如果需要，也可以添加按键监听来处理回车键
    cell.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // 防止换行
            cell.blur(); // 失焦以保存数据
        }
    });

    // 阻止编辑的函数
    function preventEdit(event) {
        event.preventDefault();
    }

    // 保存单元格数据的函数
    function saveCellData(cell) {
        // 这里可以添加代码来保存单元格的数据到存储或其他地方
        console.log('Saving data:', cell.textContent);
    }
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
