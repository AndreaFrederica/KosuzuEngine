<template>
  <div class="typewriter-container" ref="containerRef">
    <!-- 调试面板 -->
    <div v-if="showDebugPanel" class="debug-panel">
      <div class="debug-title">Typewriter Debug</div>
      <div class="debug-item">
        <span class="debug-label">currentPage:</span>
        <span class="debug-value">{{ currentPage }} / {{ pages.length - 1 }}</span>
      </div>
      <div class="debug-item">
        <span class="debug-label">isTyping:</span>
        <span class="debug-value" :class="{ active: isTyping }">{{ isTyping }}</span>
      </div>
      <div class="debug-item">
        <span class="debug-label">typingTimer:</span>
        <span class="debug-value">{{ typingTimer !== null ? 'active' : 'null' }}</span>
      </div>
      <div class="debug-item">
        <span class="debug-label">autoAdvanceTimer:</span>
        <span class="debug-value">{{ autoAdvanceTimer !== null ? 'active' : 'null' }}</span>
      </div>
      <div class="debug-item">
        <span class="debug-label">textNodes:</span>
        <span class="debug-value">{{ currentTextNodes.length }}</span>
      </div>
      <div class="debug-item">
        <span class="debug-label">enabled:</span>
        <span class="debug-value">{{ enabled }}</span>
      </div>
    </div>

    <!-- 分页指示器 -->
    <div v-if="pages.length > 1" class="page-indicator">
      <button
        v-for="(_, index) in pages"
        :key="index"
        :class="['page-dot', { active: currentPage === index }]"
        @click="goToPage(index)"
        :aria-label="`第 ${index + 1} 页`"
      >
        {{ index + 1 }}
      </button>
    </div>

    <!-- 文本内容区域 -->
    <div class="text-content" ref="textRef"></div>

    <!-- 隐藏的测试容器，用于高度检测 -->
    <div class="hidden-tester" ref="hiddenTesterRef"></div>

    <!-- 分页导航（左右箭头） -->
    <div v-if="pages.length > 1" class="page-navigation">
      <button
        v-if="currentPage > 0"
        class="nav-btn nav-prev"
        @click="previousPage"
        aria-label="上一页"
      >
        ◀
      </button>
      <button
        v-if="currentPage < pages.length - 1"
        class="nav-btn nav-next"
        @click="nextPage"
        aria-label="下一页"
      >
        ▶
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted, nextTick, computed } from 'vue';

interface Props {
  text: string;
  isHtml?: boolean;
  enabled?: boolean; // 是否启用打字机效果
  speed?: number; // 打字速度 1-100，越大越快
  autoSpeed?: number; // 自动翻页速度 1-100，越大越快
  maxHeight?: number; // 容器最大高度（px），超出则分页
  showDebugPanel?: boolean; // 是否显示调试面板（从 DialogBox 的 showTypewriterDebug 传入）
}

const props = withDefaults(defineProps<Props>(), {
  isHtml: false,
  enabled: true,
  speed: 50,
  autoSpeed: 50,
  maxHeight: 150,
  showDebugPanel: true,
});

const emit = defineEmits<{
  (e: 'complete'): void;
  (e: 'all-complete'): void;
  (e: 'skip'): void;
  (e: 'typing-state-change', isTyping: boolean): void;
}>();

const containerRef = ref<HTMLElement | null>(null);
const textRef = ref<HTMLElement | null>(null);
const hiddenTesterRef = ref<HTMLElement | null>(null);
const currentPage = ref(0);
const pages = ref<HTMLElement[]>([]);
const isTyping = ref(false);
let typingTimer: number | null = null;
let autoAdvanceTimer: number | null = null;
let currentTextNodes: Text[] = [];
let currentOriginalTexts: string[] = [];

const PAGING_THRESHOLD = 0.95;

const typingDelay = computed(() => {
  const minDelay = 10;
  const maxDelay = 200;
  const normalizedSpeed = Math.max(1, Math.min(100, props.speed));
  return maxDelay - ((normalizedSpeed - 1) / 99) * (maxDelay - minDelay);
});

const autoAdvanceDelay = computed(() => {
  // 值越大越快：把 1-100 映射到 1200ms-120ms
  const minDelay = 120;
  const maxDelay = 1200;
  const normalized = Math.max(1, Math.min(100, props.autoSpeed));
  return maxDelay - ((normalized - 1) / 99) * (maxDelay - minDelay);
});

// ==================== 模板生成器 ====================

// 获取元素在根节点下的路径
function getElementPath(rootElement: HTMLElement, element: HTMLElement): string {
  let path = '';
  let current = element;

  while (current && current !== rootElement) {
    const parent = current.parentElement;
    if (!parent) break;

    const tagName = current.tagName.toLowerCase();
    const siblings = Array.from(parent.children);
    let index = 0;
    for (const child of siblings) {
      if (child === current) break;
      if ((child as HTMLElement).tagName.toLowerCase() === tagName) index++;
    }

    path = `/${tagName}[${index}]` + path;
    current = parent;
  }

  return path;
}

// 根据路径创建模板
function createTemplateByPath(rootElement: HTMLElement, path: string): HTMLElement {
  const parts = path.split('/').filter(Boolean);
  const motherDiv = document.createElement('div');
  let currentParent: HTMLElement = motherDiv;
  let pointer = rootElement;
  let currentPath = '';

  for (const part of parts) {
    const match = part.match(/([a-zA-Z]+)\[(\d+)\]/i);
    if (!match) continue;

    const tagName = match[1]?.toLowerCase() || '';
    const index = parseInt(match[2] || '0', 10);

    let counter = 0;
    let foundElement: HTMLElement | null = null;

    for (let i = 0; i < pointer.children.length; i++) {
      const child = pointer.children[i] as HTMLElement;
      if (child.tagName.toLowerCase() === tagName) {
        if (counter === index) {
          foundElement = child;
          break;
        }
        counter++;
      }
    }

    if (foundElement) {
      pointer = foundElement;
      currentPath += '/' + `${tagName}[${index}]`;
      const newElement = cloneElementStyleAndClass(pointer);
      newElement.setAttribute('data-path', currentPath);
      currentParent.appendChild(newElement);
      currentParent = newElement;
    } else {
      return motherDiv;
    }
  }

  return motherDiv;
}

// 从模板中获取最深的指针（不包括目标元素自身）
function getDeepestPointer(template: HTMLElement, path: string): HTMLElement {
  const parts = path.split('/').filter(Boolean);
  parts.pop(); // 移除最后一级（目标元素自身）

  if (parts.length === 0) {
    return template;
  }

  const targetDataPath = '/' + parts.join('/');
  const found = template.querySelector(`[data-path="${targetDataPath}"]`) as HTMLElement;

  return found || template;
}

// 克隆元素并添加路径信息
function cloneElementWithPath(rootElement: HTMLElement, element: HTMLElement): HTMLElement {
  const cloned = cloneElementStyleAndClass(element);
  const path = getElementPath(rootElement, element);
  cloned.setAttribute('data-path', path);
  return cloned;
}

// ==================== 分页器核心 ====================

// 克隆元素，保留样式和类
function cloneElementStyleAndClass(element: HTMLElement): HTMLElement {
  const cloned = document.createElement(element.tagName);
  cloned.className = element.className;
  cloned.style.cssText = element.style.cssText;
  cloned.removeAttribute('id');
  Array.from(element.attributes).forEach((attr) => {
    const name = attr.name;
    if (name === 'id' || name === 'class' || name === 'style') return;
    cloned.setAttribute(name, attr.value);
  });
  return cloned;
}

// 检查是否只有文本
function hasOnlyText(element: HTMLElement): boolean {
  return element.childNodes.length === 1 && element.childNodes[0]?.nodeType === Node.TEXT_NODE;
}

// 检查节点是否为叶子节点
function nodeIsLeaf(node: HTMLElement): boolean {
  if (node.childNodes.length === 1 && node.childNodes[0]?.nodeType === Node.TEXT_NODE) {
    return true;
  }
  if (['IMG', 'BR', 'SVG', 'CODE', 'PRE', 'MATH', 'NAV'].includes(node.nodeName)) {
    return true;
  }
  if (node.nodeName === 'P') return true;
  if (/^H[1-6]$/.test(node.nodeName)) return true;
  return false;
}

// 简单段落分割（用于高级分页）
function getParagraphsSimple(
  element: HTMLElement,
  pointerDiv?: HTMLElement,
): [HTMLElement, HTMLElement] | undefined {
  if (!hasOnlyText(element) || element.tagName.toLowerCase() === 'img') {
    return undefined;
  }

  const part1 = cloneElementStyleAndClass(element);
  const part2 = cloneElementStyleAndClass(element);
  const text = element.innerText;
  const container = pointerDiv || hiddenTesterRef.value!;
  const heightProbe = hiddenTesterRef.value || container;

  container.appendChild(part1);

  let part1Text = '';
  for (const char of text) {
    part1Text += char;
    part1.innerText = part1Text;

    if (heightProbe.scrollHeight / props.maxHeight >= PAGING_THRESHOLD) {
      // patchouli 的 pointer 分页器这里需要把 part1 及时移除，否则后续测量会“发电”
      if (pointerDiv) container.removeChild(part1);
      break;
    }
  }

  if (part1Text.length <= 5) return undefined;

  part1Text = part1Text.substring(0, part1Text.length - 1);
  part1.innerText = part1Text;
  const remainingText = text.slice(part1Text.length);
  part2.innerText = remainingText;

  // 对 part2 做强制样式注入，避免缩进/空白导致的分页异常
  part2.style.padding = '0';
  part2.style.margin = '0';
  part2.style.textIndent = '0';
  part2.style.whiteSpace = 'normal';

  return [part1, part2];
}

// 高阶指针分页引擎核心
function pagedEnginePointerHighLevel(
  rootElement: HTMLElement,
  testerContainer: HTMLElement,
): HTMLElement[] {
  const pagesList: HTMLElement[] = [];
  const savedPart2Container: { part2: HTMLElement | undefined } = { part2: undefined };

  // 主处理函数
  function processElement(element: HTMLElement, divTemplate: HTMLElement): boolean {
    const path = getElementPath(rootElement, element);
    const pointer = getDeepestPointer(divTemplate, path);

    if (!pointer) {
      console.warn('[TypewriterText] 无法找到指针:', path);
      return false;
    }

    // 叶子节点处理
    if (nodeIsLeaf(element)) {
      const clonedLeaf = cloneElementWithPath(rootElement, element);
      pointer.appendChild(clonedLeaf);

      testerContainer.innerHTML = '';
      testerContainer.appendChild(divTemplate.cloneNode(true));
      const currentHeight = testerContainer.scrollHeight;

      if (currentHeight > props.maxHeight * PAGING_THRESHOLD) {
        // 超出高度，尝试高级分割
        pointer.removeChild(clonedLeaf);

        if (element.tagName !== 'IMG' && hasOnlyText(element)) {
          const result = getParagraphsSimple(element, pointer);
          if (result) {
            const [part1, part2] = result;
            pointer.appendChild(part1);
            savedPart2Container.part2 = part2;
            return false; // 需要分页
          }
        }

        return false; // 页面已满
      }

      return true; // 继续添加
    }

    // 非叶子节点：递归处理
    if (hasOnlyText(element)) {
      // 纯文本容器，尝试分割
      const result = getParagraphsSimple(element, pointer);
      if (result) {
        const [part1, part2] = result;
        pointer.appendChild(part1);
        savedPart2Container.part2 = part2;
        return false; // 需要分页
      }

      const clonedPara = cloneElementWithPath(rootElement, element);
      clonedPara.textContent = element.textContent;
      pointer.appendChild(clonedPara);
      return true;
    }

    // 容器节点：创建新模板并递归
    const containerTemplate = createTemplateByPath(rootElement, path);
    const containerPointer = getDeepestPointer(containerTemplate, path);

    if (!containerPointer) {
      console.warn('[TypewriterText] 无法创建容器模板:', path);
      return false;
    }

    // 合并模板到当前 divTemplate
    const clonedContainer = cloneElementWithPath(rootElement, element);
    pointer.appendChild(clonedContainer);

    // 递归处理子元素
    for (let i = 0; i < element.children.length; i++) {
      const child = element.children[i] as HTMLElement;

      // 更新模板以包含当前容器
      const updatedTemplate = divTemplate.cloneNode(true) as HTMLElement;
      const updatedPointer = getDeepestPointer(updatedTemplate, path);

      if (!updatedPointer) {
        return false;
      }

      const canContinue = processElement(child, updatedTemplate);

      if (!canContinue) {
        // 当前页已满
        return false;
      }

      // 成功添加子元素，更新 divTemplate
      Object.assign(divTemplate, updatedTemplate);
    }

    return true;
  }

  // 主循环：处理所有内容
  let hasMoreContent = true;

  while (hasMoreContent) {
    const motherDiv = document.createElement('div');
    motherDiv.className = rootElement.className;

    // 检查是否有 part2 剩余内容
    if (savedPart2Container.part2) {
      const part2Element = savedPart2Container.part2;
      savedPart2Container.part2 = undefined;

      const tempDiv = document.createElement('div');
      tempDiv.appendChild(part2Element.cloneNode(true));

      testerContainer.innerHTML = '';
      testerContainer.appendChild(tempDiv);

      if (testerContainer.scrollHeight <= props.maxHeight * PAGING_THRESHOLD) {
        // part2 可以独立成页
        pagesList.push(tempDiv);
        continue;
      }

      // part2 需要继续分页，递归处理
      processElement(part2Element, motherDiv);
    } else {
      // 处理根元素的子元素
      for (let i = 0; i < rootElement.children.length; i++) {
        const child = rootElement.children[i] as HTMLElement;
        const canContinue = processElement(child, motherDiv);

        if (!canContinue) {
          // 当前页已满，保存并开始新页
          if (motherDiv.children.length > 0) {
            pagesList.push(motherDiv);
          }
          break;
        }
      }

      hasMoreContent = false; // 根元素处理完毕
    }

    // 保存最后一页
    if (motherDiv.children.length > 0 && !savedPart2Container.part2) {
      pagesList.push(motherDiv);
    }

    // 检查是否还有 part2 需要处理
    if (savedPart2Container.part2) {
      hasMoreContent = true;
    }
  }

  // 如果没有任何页面，检查根元素是否直接包含文本内容
  if (pagesList.length === 0) {
    const fallbackDiv = document.createElement('div');
    fallbackDiv.className = rootElement.className;
    // 克隆根元素的所有子节点（包括文本节点）
    Array.from(rootElement.childNodes).forEach((child) => {
      fallbackDiv.appendChild(child.cloneNode(true));
    });
    return [fallbackDiv];
  }

  return pagesList.length > 0 ? pagesList : [document.createElement('div')];
}

// 渲染页面
function renderPage(pageIndex: number) {
  if (!textRef.value || pageIndex < 0 || pageIndex >= pages.value.length) return;

  textRef.value.innerHTML = '';
  const pageElement = pages.value[pageIndex];
  if (!pageElement) return;

  const clonedPage = pageElement.cloneNode(true) as HTMLElement;
  textRef.value.appendChild(clonedPage);

  // 如果未启用打字机效果，确保所有文本都是可见的
  if (!props.enabled) {
    const allTextNodes = collectTextNodes(clonedPage);
    allTextNodes.forEach((node) => {
      // 确保文本节点的内容完整
      // collectTextNodes 只会收集非空的文本节点
      const content = node.textContent;
      if (content !== null) {
        // 确保文本内容完整显示
        // 某些情况下 textContent 可能会变成空的
      }
    });
  }
}

// 收集所有文本节点
function collectTextNodes(element: HTMLElement): Text[] {
  const textNodes: Text[] = [];

  function traverse(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      // 收集所有文本节点，包括空白文本
      const textNode = node as Text;
      if (textNode.textContent !== null && textNode.textContent !== '') {
        textNodes.push(textNode);
      }
    } else {
      node.childNodes.forEach(traverse);
    }
  }

  traverse(element);
  return textNodes;
}

// 开始打字机效果
function startTypewriter() {
  if (!props.enabled || !textRef.value) return;

  stopTypewriter();
  console.log('[TypewriterText] startTypewriter() setting isTyping to true');
  isTyping.value = true;
  console.log('[TypewriterText] After setting, isTyping:', isTyping.value);

  // 重新渲染当前页，确保文本节点存在
  renderPage(currentPage.value);

  // 等待 DOM 更新
  void nextTick(() => {
    currentTextNodes = collectTextNodes(textRef.value!);
    currentOriginalTexts = currentTextNodes.map((node) => node.textContent || '');

    // 如果没有找到任何文本节点，可能页面是空的
    if (currentTextNodes.length === 0) {
      isTyping.value = false;
      emit('complete');
      scheduleAutoAdvanceIfNeeded();
      if (currentPage.value === pages.value.length - 1) emit('all-complete');
      return;
    }

    currentTextNodes.forEach((node) => {
      node.textContent = '';
    });

    typeNextChar(currentOriginalTexts, 0, 0);
  });
}

// 打字下一个字符
function typeNextChar(originalTexts: string[], nodeIndex: number, charIndex: number) {
  if (nodeIndex >= currentTextNodes.length) {
    isTyping.value = false;
    emit('complete');
    scheduleAutoAdvanceIfNeeded();
    if (currentPage.value === pages.value.length - 1) emit('all-complete');
    return;
  }

  const currentNode = currentTextNodes[nodeIndex];
  const targetText = originalTexts[nodeIndex];

  if (!currentNode || !targetText) {
    // 跳过无效节点，继续下一个
    typeNextChar(originalTexts, nodeIndex + 1, 0);
    return;
  }

  if (charIndex < targetText.length) {
    currentNode.textContent = targetText.substring(0, charIndex + 1);

    typingTimer = window.setTimeout(() => {
      typeNextChar(originalTexts, nodeIndex, charIndex + 1);
    }, typingDelay.value);
  } else {
    typeNextChar(originalTexts, nodeIndex + 1, 0);
  }
}

function stopTypewriter() {
  if (typingTimer !== null) {
    clearTimeout(typingTimer);
    typingTimer = null;
  }
  if (autoAdvanceTimer !== null) {
    clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = null;
  }
  isTyping.value = false;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function revealAllCurrentPage() {
  if (!textRef.value) return;

  stopTypewriter();

  // 重新渲染当前页，确保显示完整内容
  // 无论打字机是否启动过，这都能正确显示完整文本
  renderPage(currentPage.value);

  // 清空打字机状态
  currentTextNodes = [];
  currentOriginalTexts = [];

  emit('skip');
  emit('complete');
  // 不调用 scheduleAutoAdvanceIfNeeded()，需要用户再次点击才能继续
  if (currentPage.value === pages.value.length - 1) emit('all-complete');
}

function scheduleAutoAdvanceIfNeeded() {
  if (autoAdvanceTimer !== null) {
    clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = null;
  }

  if (pages.value.length <= 1) return;
  if (currentPage.value >= pages.value.length - 1) return;

  autoAdvanceTimer = window.setTimeout(() => {
    autoAdvanceTimer = null;
    void goToPage(currentPage.value + 1);
  }, autoAdvanceDelay.value);
}

watch(
  () => props.text,
  async (newText) => {
    stopTypewriter();

    if (!newText || !textRef.value) {
      textRef.value!.innerHTML = '';
      pages.value = [];
      currentPage.value = 0;
      return;
    }

    // 未启用打字机效果：直接显示 raw html，不分页
    if (!props.enabled) {
      if (props.isHtml) {
        textRef.value.innerHTML = newText;
      } else {
        textRef.value.textContent = newText;
      }
      pages.value = [];
      currentPage.value = 0;
      return;
    }

    // 启用打字机效果：进行分页计算
    const tempDiv = document.createElement('div');
    if (props.isHtml) {
      tempDiv.innerHTML = newText;
    } else {
      tempDiv.textContent = newText;
    }

    // 使用高阶指针分页器
    if (!hiddenTesterRef.value) {
      console.warn('[TypewriterText] hiddenTesterRef 不可用');
      return;
    }
    const pagesResult = pagedEnginePointerHighLevel(tempDiv, hiddenTesterRef.value);
    pages.value = pagesResult;
    currentPage.value = 0;

    await nextTick();
    renderPage(0);

    await nextTick();
    startTypewriter();
  },
  { immediate: true },
);

watch(
  () => props.enabled,
  async (enabled) => {
    if (!enabled && textRef.value) {
      // 禁用打字机：直接显示原始 HTML
      stopTypewriter();
      if (props.isHtml) {
        textRef.value.innerHTML = props.text;
      } else {
        textRef.value.textContent = props.text;
      }
      pages.value = [];
      currentPage.value = 0;
    } else if (enabled && props.text) {
      // 启用打字机：重新进行分页
      const tempDiv = document.createElement('div');
      if (props.isHtml) {
        tempDiv.innerHTML = props.text;
      } else {
        tempDiv.textContent = props.text;
      }

      if (!hiddenTesterRef.value) {
        console.warn('[TypewriterText] hiddenTesterRef 不可用');
        return;
      }

      const pagesResult = pagedEnginePointerHighLevel(tempDiv, hiddenTesterRef.value);
      pages.value = pagesResult;
      currentPage.value = 0;

      await nextTick();
      renderPage(0);

      await nextTick();
      startTypewriter();
    }
  },
);

async function goToPage(index: number) {
  if (index >= 0 && index < pages.value.length) {
    stopTypewriter();
    currentPage.value = index;
    renderPage(index);

    if (props.enabled) {
      await nextTick();
      startTypewriter();
    }
  }
}

function previousPage() {
  if (currentPage.value > 0) {
    void goToPage(currentPage.value - 1);
  }
}

function nextPage() {
  if (currentPage.value < pages.value.length - 1) {
    void goToPage(currentPage.value + 1);
  }
}

onUnmounted(() => {
  stopTypewriter();
});

defineExpose({
  isTyping,
  currentPage,
  pageCount: computed(() => pages.value.length),
  hasNextPage: computed(() => currentPage.value < pages.value.length - 1),
  hasPrevPage: computed(() => currentPage.value > 0),
  revealAll: () => {
    if (!textRef.value) return;

    stopTypewriter();

    // 重新渲染当前页，确保显示完整内容
    renderPage(currentPage.value);

    // 清空打字机状态
    currentTextNodes = [];
    currentOriginalTexts = [];

    // 不触发任何事件，只负责显示内容
  },
  goToPage,
  nextPage,
  previousPage,
});
</script>

<style scoped>
.typewriter-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.debug-panel {
  position: absolute;
  top: -160px;
  right: 0;
  width: 200px;
  background: rgba(0, 0, 0, 0.85);
  color: #00ff00;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  padding: 8px;
  border-radius: 4px;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.debug-title {
  font-weight: bold;
  color: #ffff00;
  margin-bottom: 6px;
  border-bottom: 1px solid #444;
  padding-bottom: 4px;
}

.debug-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.debug-label {
  color: #888;
}

.debug-value {
  color: #00ff00;
}

.debug-value.active {
  color: #ff9800;
  font-weight: bold;
}

.page-indicator {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  gap: 6px;
  padding: 4px;
  z-index: 10;
}

.page-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.3);
  background: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.page-dot:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: scale(1.1);
}

.page-dot.active {
  background: #1976d2;
  color: white;
  border-color: #1565c0;
}

.text-content {
  width: 100%;
  overflow: hidden;
  font-size: 1.1em;
  white-space: pre-wrap;
  line-height: 1.5;
  cursor: pointer;
  min-height: 50px;
}

.hidden-tester {
  position: absolute;
  visibility: hidden;
  pointer-events: none;
  top: 0;
  left: 0;
  width: 100%;
  max-height: v-bind('props.maxHeight + "px"');
  overflow: hidden;
  font-size: 1.1em;
  white-space: pre-wrap;
  line-height: 1.5;
}

.page-navigation {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  transform: translateY(-50%);
  pointer-events: none;
  display: flex;
  justify-content: space-between;
  padding: 0 4px;
}

.nav-btn {
  pointer-events: auto;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.3);
  background: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  backdrop-filter: blur(4px);
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.95);
  transform: scale(1.1);
}

.nav-btn:active {
  transform: scale(0.95);
}
</style>
