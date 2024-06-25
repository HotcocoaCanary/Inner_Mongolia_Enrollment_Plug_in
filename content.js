chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "changeValue") {
        const data = request.value;
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                const value = data[key];
                // 尝试根据name属性查找输入元素
                let inputElements = document.querySelectorAll(`[name="${key}"]`);
                // 如果没有找到，尝试根据id属性查找
                if (inputElements.length === 0) {
                    inputElements = document.querySelectorAll(`[id="${key}"]`);
                }
                // 遍历所有找到的元素
                inputElements.forEach(inputElement => {
                    if (inputElement.type === "radio") {
                        // 如果是单选按钮，根据value属性设置选中状态
                        inputElement.checked = inputElement.value === value;
                    } else {
                        // 否则，设置value属性
                        inputElement.value = value;
                    }
                });
            }
        }
    }
});
