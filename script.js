// CRC8 MAXIM 校验码计算器 - 专用版本（多项式0x8C）
class CRC8Calculator {
  constructor() {
    // CRC8 MAXIM算法配置（多项式0x8C）
    this.algorithm = {
      poly: 0x8C,
      init: 0x00,
      name: 'CRC8-MAXIM'
    };
  }

  // CRC8 MAXIM算法实现（根据您提供的C代码改写）
  calculate(data) {
    const polynomial = this.algorithm.poly; // 0x8C
    let crc = this.algorithm.init; // 0x00

    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      for (let j = 0; j < 8; j++) {
        if (crc & 0x01) {
          crc = (crc >> 1) ^ polynomial;
        } else {
          crc = crc >> 1;
        }
      }
    }

    return crc;
  }

  // 文本转字节数组
  textToBytes(text) {
    return new TextEncoder().encode(text);
  }

  // 十六进制字符串转字节数组
  hexToBytes(hexString) {
    // 移除空格和0x前缀
    const cleaned = hexString.replace(/\s+/g, '').replace(/0x/gi, '');

    // 验证十六进制格式
    if (!/^[0-9A-Fa-f]*$/.test(cleaned)) {
      throw new Error('无效的十六进制格式');
    }

    // 确保偶数长度
    const padded = cleaned.length % 2 ? '0' + cleaned : cleaned;

    const bytes = [];
    for (let i = 0; i < padded.length; i += 2) {
      bytes.push(parseInt(padded.substr(i, 2), 16));
    }

    return new Uint8Array(bytes);
  }

  // 主要计算方法
  computeCRC8(inputData, inputFormat) {
    const startTime = performance.now();

    try {
      // 转换输入数据
      let data;
      if (inputFormat === 'hex') {
        data = this.hexToBytes(inputData);
      } else {
        data = this.textToBytes(inputData);
      }

      // 计算CRC8
      const result = this.calculate(data);
      const endTime = performance.now();

      return {
        success: true,
        result: result,
        hex: '0x' + result.toString(16).toUpperCase().padStart(2, '0'),
        dec: result.toString(),
        bin: result.toString(2).padStart(8, '0'),
        algorithm: this.algorithm.name,
        polynomial: '0x' + this.algorithm.poly.toString(16).toUpperCase(),
        dataLength: data.length,
        processTime: Math.round((endTime - startTime) * 1000) / 1000 // 微秒
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// 应用程序主类
class CRC8App {
  constructor() {
    this.calculator = new CRC8Calculator();
    this.history = JSON.parse(localStorage.getItem('crc8_history') || '[]');
    this.theme = localStorage.getItem('crc8_theme') || 'light';
    this.calculateTimeout = null;
    this.currentDataLength = 9; // 默认9字节

    this.initializeElements();
    this.createHexInputGrid();
    this.bindEvents();
    this.applyTheme();
    this.initializeAlgorithmInfo();
    this.loadHistory();
  }

  // 初始化DOM元素
  initializeElements() {
    this.elements = {
      // 输入相关
      hexInputGrid: document.getElementById('hexInputGrid'),

      // 结果相关
      hexResult: document.getElementById('hexResult'),
      decResult: document.getElementById('decResult'),
      binResult: document.getElementById('binResult'),
      calcInfo: document.getElementById('calcInfo'),
      usedPoly: document.getElementById('usedPoly'),
      processTime: document.getElementById('processTime'),

      // 按钮
      calculateBtn: document.getElementById('calculateBtn'),
      exampleBtn: document.getElementById('exampleBtn'),
      clearInput: document.getElementById('clearInput'),
      fillZeros: document.getElementById('fillZeros'),
      themeToggle: document.getElementById('themeToggle'),
      algorithmToggle: document.getElementById('algorithmToggle'),
      copyBtns: document.querySelectorAll('.btn-copy'),

      // 其他
      inputStatus: document.getElementById('inputStatus'),
      historyList: document.getElementById('historyList'),
      clearHistory: document.getElementById('clearHistory'),
      toast: document.getElementById('toast')
    };
  }

  // 创建十六进制输入格子
  createHexInputGrid() {
    this.elements.hexInputGrid.innerHTML = '';

    // 计算行数和每行的格子数
    const cellsPerRow = Math.ceil(this.currentDataLength / 2);

    // 创建第一行
    const row1 = document.createElement('div');
    row1.className = 'hex-input-row';

    // 创建第二行
    const row2 = document.createElement('div');
    row2.className = 'hex-input-row';

    for (let i = 0; i < this.currentDataLength; i++) {
      const cell = document.createElement('div');
      cell.className = 'hex-input-cell';

      const label = document.createElement('div');
      label.className = 'cell-label';
      label.textContent = `DATA[${i}]`;

      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 2;
      input.placeholder = '00';
      input.pattern = '[0-9A-Fa-f]{2}';
      input.dataset.index = i;
      input.addEventListener('input', (e) => this.handleHexInput(e));
      input.addEventListener('keydown', (e) => this.handleHexKeydown(e));
      input.addEventListener('paste', (e) => this.handlePaste(e));

      cell.appendChild(label);
      cell.appendChild(input);

      // 分配到上下两行
      if (i < cellsPerRow) {
        row1.appendChild(cell);
      } else {
        row2.appendChild(cell);
      }
    }

    this.elements.hexInputGrid.appendChild(row1);
    if (this.currentDataLength > cellsPerRow) {
      this.elements.hexInputGrid.appendChild(row2);
    }

    this.updateInputStatus();
  }  // 处理十六进制输入
  handleHexInput(e) {
    const input = e.target;
    let value = input.value.toUpperCase().replace(/[^0-9A-F]/g, '');

    if (value.length > 2) {
      value = value.substring(0, 2);
    }

    input.value = value;

    // 自动跳转到下一个输入框
    if (value.length === 2) {
      const nextIndex = parseInt(input.dataset.index) + 1;
      const nextInput = this.elements.hexInputGrid.querySelector(`input[data-index="${nextIndex}"]`);
      if (nextInput) {
        nextInput.focus();
      }
    }

    this.updateInputStatus();
    this.debounceCalculate();
  }

  // 处理键盘事件
  handleHexKeydown(e) {
    const input = e.target;
    const index = parseInt(input.dataset.index);

    // 允许导航键
    if (['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      if (e.key === 'Backspace' && input.value === '' && index > 0) {
        // 回退到上一个输入框
        const prevInput = this.elements.hexInputGrid.querySelector(`input[data-index="${index - 1}"]`);
        if (prevInput) {
          prevInput.focus();
        }
      }
      return;
    }

    // 只允许十六进制字符
    if (!/[0-9A-Fa-f]/.test(e.key)) {
      e.preventDefault();
    }
  }

  // 处理粘贴事件
  handlePaste(e) {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').toUpperCase().replace(/[^0-9A-F\s]/g, '');
    const bytes = pasteData.replace(/\s+/g, '').match(/.{1,2}/g) || [];

    const startIndex = parseInt(e.target.dataset.index);
    const inputs = this.elements.hexInputGrid.querySelectorAll('input');

    bytes.forEach((byte, i) => {
      const targetIndex = startIndex + i;
      if (targetIndex < inputs.length && byte.length === 2) {
        inputs[targetIndex].value = byte;
      }
    });

    this.updateInputStatus();
    this.debounceCalculate();
  }

  // 绑定事件
  bindEvents() {
    // 按钮事件
    this.elements.calculateBtn.addEventListener('click', () => this.calculate());
    this.elements.exampleBtn.addEventListener('click', () => this.loadExample());
    this.elements.clearInput.addEventListener('click', () => this.clearAllInputs());
    this.elements.fillZeros.addEventListener('click', () => this.fillWithZeros());
    this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
    this.elements.algorithmToggle.addEventListener('click', () => this.toggleAlgorithmInfo());
    this.elements.clearHistory.addEventListener('click', () => this.clearHistory());

    // 复制按钮
    this.elements.copyBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.copyResult(e.target.closest('.btn-copy').dataset.copy));
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => this.handleGlobalKeyboard(e));
  }

  // 更新输入状态显示
  updateInputStatus() {
    const inputs = this.elements.hexInputGrid.querySelectorAll('input');
    const filledCount = Array.from(inputs).filter(input => input.value.length === 2).length;
    this.elements.inputStatus.textContent = `已输入: ${filledCount}/${this.currentDataLength} 字节`;
  }

  // 获取当前输入的十六进制数据
  getCurrentHexData() {
    const inputs = this.elements.hexInputGrid.querySelectorAll('input');
    const hexValues = Array.from(inputs).map(input => input.value.padStart(2, '0'));
    return hexValues.join('');
  }

  // 防抖计算
  debounceCalculate() {
    clearTimeout(this.calculateTimeout);
    this.calculateTimeout = setTimeout(() => {
      const hexData = this.getCurrentHexData();
      if (hexData.length > 0 && hexData !== '0'.repeat(hexData.length)) {
        this.calculate();
      }
    }, 300);
  }

  // 计算CRC8
  calculate() {
    const hexData = this.getCurrentHexData();
    const inputs = this.elements.hexInputGrid.querySelectorAll('input');
    const filledCount = Array.from(inputs).filter(input => input.value.length === 2).length;

    if (filledCount === 0) {
      this.showToast('请输入数据', 'error');
      return;
    }

    // 只使用已填入的字节
    const validHexData = Array.from(inputs)
      .filter(input => input.value.length === 2)
      .map(input => input.value)
      .join('');

    const result = this.calculator.computeCRC8(validHexData, 'hex');

    if (result.success) {
      this.displayResult(result);
      this.addToHistory(result, validHexData, 'hex');
    } else {
      this.showToast(result.error, 'error');
      this.clearResult();
    }
  }

  // 清空所有输入
  clearAllInputs() {
    const inputs = this.elements.hexInputGrid.querySelectorAll('input');
    inputs.forEach(input => input.value = '');
    this.updateInputStatus();
    this.clearResult();
    if (inputs.length > 0) {
      inputs[0].focus();
    }
  }

  // 填充零
  fillWithZeros() {
    const inputs = this.elements.hexInputGrid.querySelectorAll('input');
    inputs.forEach(input => {
      if (input.value === '') {
        input.value = '00';
      }
    });
    this.updateInputStatus();
    this.debounceCalculate();
  }

  // 显示结果
  displayResult(result) {
    this.elements.hexResult.textContent = result.hex;
    this.elements.decResult.textContent = result.dec;
    this.elements.binResult.textContent = result.bin;

    this.elements.usedPoly.textContent = `${result.algorithm} (${result.polynomial})`;
    this.elements.dataLength.textContent = `${result.dataLength} 字节`;
    this.elements.processTime.textContent = `${result.processTime} μs`;

    this.elements.calcInfo.style.display = 'block';
  }

  // 清空结果
  clearResult() {
    this.elements.hexResult.textContent = '--';
    this.elements.decResult.textContent = '--';
    this.elements.binResult.textContent = '--';
    this.elements.calcInfo.style.display = 'none';
  }

  // 复制结果
  copyResult(type) {
    let text = '';
    switch (type) {
      case 'hex':
        text = this.elements.hexResult.textContent;
        break;
      case 'dec':
        text = this.elements.decResult.textContent;
        break;
      case 'bin':
        text = this.elements.binResult.textContent;
        break;
    }

    if (text && text !== '--') {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast('已复制到剪贴板', 'success');
      }).catch(() => {
        this.showToast('复制失败', 'error');
      });
    }
  }

  // 加载示例数据
  loadExample() {
    const examples = [
      // 8字节示例数据（优先显示）
      { data: ['C8', '64', '54', '00', '00', '11', '22', '33'], length: 8 },
      { data: ['01', '64', 'FF', 'E2', '00', '00', '00', '11'], length: 8 },
      { data: ['48', '65', '6C', '6C', '6F', '20', '57', '6F'], length: 8 },
      { data: ['31', '32', '33', '34', '35', '36', '37', '38'], length: 8 },
      // 其他长度示例
      { data: ['C8', '64', '54', '00', '00'], length: 5 },
      { data: ['01', '64', 'FF', 'E2', '00', '00', '00', '00', '11'], length: 9 },
      { data: ['01', '64', '00', '1E', '00', '00', '01', '00', 'B3', 'AA'], length: 10 }
    ];

    const example = examples[Math.floor(Math.random() * examples.length)];

    // 设置数据长度
    if ([5, 8, 9, 10].includes(example.length)) {
      this.elements.dataLength.value = example.length.toString();
      this.elements.customLength.style.display = 'none';
    } else {
      this.elements.dataLength.value = 'custom';
      this.elements.customLength.style.display = 'inline-block';
      this.elements.customLength.value = example.length;
    }

    this.currentDataLength = example.length;
    this.createHexInputGrid();

    // 填入数据
    const inputs = this.elements.hexInputGrid.querySelectorAll('input');
    example.data.forEach((byte, index) => {
      if (index < inputs.length) {
        inputs[index].value = byte;
      }
    });

    this.updateInputStatus();
    this.calculate();
    this.showToast('已加载示例数据', 'success');
  }

  // 添加到历史记录
  addToHistory(result, inputData, inputFormat) {
    const historyItem = {
      timestamp: new Date().toLocaleString(),
      input: inputData.length > 50 ? inputData.substring(0, 50) + '...' : inputData,
      inputFormat: inputFormat,
      algorithm: result.algorithm,
      result: result.hex,
      fullResult: result
    };

    this.history.unshift(historyItem);
    if (this.history.length > 10) {
      this.history = this.history.slice(0, 10);
    }

    localStorage.setItem('crc8_history', JSON.stringify(this.history));
    this.renderHistory();
  }

  // 渲染历史记录
  renderHistory() {
    if (this.history.length === 0) {
      this.elements.historyList.innerHTML = '<div class="history-empty">暂无历史记录</div>';
      return;
    }

    const historyHTML = this.history.map((item, index) => `
            <div class="history-item" data-index="${index}">
                <div class="history-header">
                    <span class="history-time">${item.timestamp}</span>
                    <span class="history-algorithm">${item.algorithm}</span>
                </div>
                <div class="history-content">
                    <div class="history-input">${item.inputFormat === 'hex' ? 'HEX: ' : 'TEXT: '}${item.input}</div>
                    <div class="history-result">结果: ${item.result}</div>
                </div>
            </div>
        `).join('');

    this.elements.historyList.innerHTML = historyHTML;

    // 添加点击事件
    this.elements.historyList.querySelectorAll('.history-item').forEach((item, index) => {
      item.addEventListener('click', () => this.loadHistoryItem(index));
    });
  }

  // 加载历史记录项
  loadHistoryItem(index) {
    const item = this.history[index];
    if (!item) return;

    // 解析历史数据
    const hexData = item.input.replace(/\.\.\.$/, '').replace(/\s/g, '');
    const byteCount = hexData.length / 2;

    // 设置数据长度
    if ([5, 8, 9, 10].includes(byteCount)) {
      this.elements.dataLength.value = byteCount.toString();
      this.elements.customLength.style.display = 'none';
    } else {
      this.elements.dataLength.value = 'custom';
      this.elements.customLength.style.display = 'inline-block';
      this.elements.customLength.value = byteCount;
    }

    this.currentDataLength = byteCount;
    this.createHexInputGrid();

    // 填入历史数据
    const inputs = this.elements.hexInputGrid.querySelectorAll('input');
    for (let i = 0; i < byteCount && i < inputs.length; i++) {
      const byte = hexData.substr(i * 2, 2);
      inputs[i].value = byte.toUpperCase();
    }

    this.updateInputStatus();

    // 显示结果
    if (item.fullResult) {
      this.displayResult(item.fullResult);
    }

    this.showToast('已加载历史记录', 'success');
  }

  // 加载历史记录
  loadHistory() {
    this.renderHistory();
  }

  // 清空历史记录
  clearHistory() {
    if (confirm('确定要清空所有历史记录吗？')) {
      this.history = [];
      localStorage.removeItem('crc8_history');
      this.renderHistory();
      this.showToast('历史记录已清空', 'success');
    }
  }

  // 切换主题
  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('crc8_theme', this.theme);
    this.applyTheme();
  }

  // 应用主题
  applyTheme() {
    document.body.classList.toggle('dark-theme', this.theme === 'dark');
    const icon = this.elements.themeToggle.querySelector('i');
    icon.className = this.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  }

  // 初始化算法信息状态
  initializeAlgorithmInfo() {
    const isCollapsed = localStorage.getItem('crc8_algorithm_collapsed') === 'true';
    const infoCard = document.querySelector('.info-card');

    // 如果没有保存的状态，默认收起
    if (localStorage.getItem('crc8_algorithm_collapsed') === null || isCollapsed) {
      infoCard.classList.add('collapsed');
    } else {
      infoCard.classList.remove('collapsed');
    }
  }

  // 切换算法信息显示
  toggleAlgorithmInfo() {
    const infoCard = document.querySelector('.info-card');
    const toggleIcon = this.elements.algorithmToggle.querySelector('.toggle-btn i');

    infoCard.classList.toggle('collapsed');

    // 保存状态到本地存储
    const isCollapsed = infoCard.classList.contains('collapsed');
    localStorage.setItem('crc8_algorithm_collapsed', isCollapsed);
  }

  // 显示提示消息
  showToast(message, type = 'info') {
    const toast = this.elements.toast;
    const icon = toast.querySelector('i');
    const messageSpan = toast.querySelector('.toast-message');

    // 设置图标
    icon.className = type === 'success' ? 'fas fa-check-circle' :
      type === 'error' ? 'fas fa-exclamation-circle' :
        'fas fa-info-circle';

    // 设置消息
    messageSpan.textContent = message;

    // 设置样式
    toast.className = `toast show ${type}`;

    // 自动隐藏
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  // 全局键盘快捷键处理
  handleGlobalKeyboard(e) {
    const isCtrlCmd = e.ctrlKey || e.metaKey;

    switch (e.key) {
      case 'Enter':
        if (isCtrlCmd) {
          e.preventDefault();
          this.calculate();
        }
        break;
      case 'l':
        if (isCtrlCmd) {
          e.preventDefault();
          this.clearAllInputs();
        }
        break;
      case 'c':
        if (isCtrlCmd && document.activeElement.closest('.result-section')) {
          e.preventDefault();
          this.copyResult('hex');
        }
        break;
      case 'F1':
        e.preventDefault();
        this.loadExample();
        break;
      case '0':
        if (isCtrlCmd) {
          e.preventDefault();
          this.fillWithZeros();
        }
        break;
    }
  }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
  new CRC8App();
});