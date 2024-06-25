document.getElementById('changeValue').addEventListener('click', () => {
    const selectedRadio = document.querySelector('input[name="selection"]:checked');
    let selectedRadioId = selectedRadio ? selectedRadio.value : '1';

    chrome.storage.local.get('configData', (data) => {
        if (chrome.runtime.lastError) {
            console.error('Error reading from chrome.storage:', chrome.runtime.lastError);
            return;
        }

        const selectedObject = data.configData[selectedRadioId];

        chrome.tabs.query({active: true, currentWindow: true}, tabs => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "changeValue",
                value: selectedObject
            });
        });
    });
});

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

            const radioCell = row.insertCell();
            const radioInput = document.createElement('input');
            radioInput.type = 'radio';
            radioInput.name = 'selection';
            radioInput.value = key; // 设置单选按钮的value为对象的键值
            radioCell.appendChild(radioInput);

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

            row.addEventListener('click', function(event) {
                if (event.target.tagName === 'BUTTON') {
                    return;
                }
                radioInput.checked = true;
            });
        }
    }
}
function init() {
    fetchConfigJson()
        .then(config => {
            const thead = document.getElementById('data-table').getElementsByTagName('thead')[0];
            thead.innerHTML = '';
            const headerRow = thead.insertRow();

            const headerRadioCell = headerRow.insertCell();
            headerRadioCell.innerText = '选择';

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

init();
