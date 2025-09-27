type MermaidNamespace = {
  initialize: (config: { startOnLoad: boolean; theme: string; securityLevel?: string }) => void
  render: (id: string, definition: string) => Promise<{ svg: string; bindFunctions?: (element: Element) => void }>
}
import { DEFAULT_SETTINGS, getSettings, normalizeSettings } from '../shared/settings'
import { doesUrlMatchPatterns } from '../shared/url'

const BLOCK_DATA_STATUS = 'coderchartStatus'
const BLOCK_DATA_SOURCE = 'coderchartSource'
const PNG_PREPARING_LABEL = 'Preparing PNG…'
let diagramCounter = 0
let blockIdentifierCounter = 0
let observer: MutationObserver | null = null
let isActive = false
let currentSettings = DEFAULT_SETTINGS
const processedBlocks = new Map<HTMLElement, BlockRegistryEntry>()
let mermaidPromise: Promise<MermaidNamespace> | null = null

async function ensureMermaid(): Promise<MermaidNamespace> {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((module) => {
      const candidate = (module as { default?: MermaidNamespace })?.default
      return (candidate ?? (module as unknown as MermaidNamespace))
    })
  }
  return mermaidPromise
}

const RENDER_HARD_FAIL_NOTICE = 'Mermaid could not render this diagram.'
const MERMAID_KEYWORDS = [
  'graph',
  'flowchart',
  'sequenceDiagram',
  'classDiagram',
  'stateDiagram',
  'erDiagram',
  'gantt',
  'pie',
  'mindmap',
  'timeline',
  'journey',
  'quadrantChart',
  'gitGraph',
]

type BlockRegistryEntry = {
  id: string
  container: HTMLElement
  diagramHost: HTMLElement
  collapseButton: HTMLButtonElement
  downloadSvgButton: HTMLButtonElement
  downloadPngButton: HTMLButtonElement
  lastSvg: string | null
  lastRenderId?: string
}

void initialise()

async function initialise() {
  currentSettings = await getSettings()
  if (shouldActivate(currentSettings)) {
    await activate()
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || !changes.settings) {
      return
    }
    const nextSettings = normalizeSettings(changes.settings.newValue)
    void applySettings(nextSettings)
  })
}

async function activate() {
  if (isActive) return
  isActive = true

  await ensureDomReady()

  await configureMermaid()
  processRoots([document])
  startObservers()
}

function deactivate() {
  if (!isActive) return
  observer?.disconnect()
  observer = null
  isActive = false
  clearRenderedBlocks()
}

async function applySettings(next: typeof currentSettings) {
  const shouldBeActive = shouldActivate(next)
  currentSettings = next

  if (shouldBeActive && !isActive) {
    void activate()
    return
  }
  if (!shouldBeActive && isActive) {
    deactivate()
  }
  if (shouldBeActive && isActive) {
    await configureMermaid()
    processRoots([document])
  }
}

function shouldActivate(settings: typeof currentSettings): boolean {
  if (!settings.autoRender) {
    return false
  }
  return doesUrlMatchPatterns(window.location.href, settings.hostPatterns)
}

function startObservers() {
  if (observer) return
  observer = new MutationObserver((mutations) => {
    const roots = gatherRootsFromMutations(mutations)
    if (roots.length > 0) {
      processRoots(roots)
    }
  })

  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
  })

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      processRoots([document])
    }
  })
}

function gatherRootsFromMutations(mutations: MutationRecord[]): ParentNode[] {
  const rootSet = new Set<ParentNode>()
  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
          rootSet.add(node as ParentNode)
        }
      })
    }

    if (mutation.type === 'characterData') {
      const parent = mutation.target.parentElement
      if (parent) {
        rootSet.add(parent)
      }
    }
  }
  return Array.from(rootSet)
}

function processRoots(roots: ParentNode[]) {
  const seenCodes = new Set<HTMLElement>()
  for (const root of roots) {
    const blocks = findMermaidBlocks(root)
    for (const block of blocks) {
      if (seenCodes.has(block.code)) continue
      seenCodes.add(block.code)
      void renderBlock(block)
    }
  }
}

type MermaidBlock = {
  pre: HTMLElement
  code: HTMLElement
}

function findMermaidBlocks(root: ParentNode): MermaidBlock[] {
  const matches: MermaidBlock[] = []

  if (root instanceof HTMLElement && root.matches('code')) {
    const block = evaluateCandidate(root)
    if (block) {
      matches.push(block)
    }
  }

  if (isSelectorRoot(root)) {
    root.querySelectorAll('pre code').forEach((element) => {
      if (!(element instanceof HTMLElement)) return
      const block = evaluateCandidate(element)
      if (block) {
        matches.push(block)
      }
    })
  }

  return matches
}

function isSelectorRoot(node: ParentNode): node is ParentNode & { querySelectorAll: (selectors: string) => NodeListOf<Element> } {
  return typeof (node as Document).querySelectorAll === 'function'
}

function evaluateCandidate(code: HTMLElement): MermaidBlock | null {
  const pre = code.closest('pre')
  if (!pre) {
    return null
  }

  if (!looksLikeMermaid(code)) {
    return null
  }

  return { pre, code }
}

function looksLikeMermaid(code: HTMLElement): boolean {
  const className = code.getAttribute('class') || ''
  if (className.split(/\s+/).some((token) => token === 'language-mermaid' || token === 'mermaid')) {
    return true
  }

  const languageAttr = code.getAttribute('data-language') || ''
  if (languageAttr.toLowerCase() === 'mermaid') {
    return true
  }

  const textContent = extractSource(code)
  if (!textContent) {
    return false
  }

  const lower = textContent.toLowerCase()
  const trimmedLines = lower
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (trimmedLines.length === 0) {
    return false
  }

  const firstContentLine = trimmedLines.find((line) => !line.startsWith('%%')) || trimmedLines[0]

  if (firstContentLine.startsWith('%%{') && trimmedLines.length > 1) {
    const nextLine = trimmedLines.find((line) => !line.startsWith('%%') && line !== firstContentLine)
    if (nextLine) {
      return MERMAID_KEYWORDS.some((keyword) => nextLine.startsWith(keyword.toLowerCase()))
    }
  }

  return (
    firstContentLine.startsWith('%%{') ||
    MERMAID_KEYWORDS.some((keyword) => firstContentLine.startsWith(keyword.toLowerCase()))
  )
}

async function renderBlock(block: MermaidBlock) {
  const mermaid = await ensureMermaid()
  const source = extractSource(block.code)
  if (!source) {
    return
  }

  const registry = ensureContainer(block.pre)
  const container = registry.container
  const diagramHost = registry.diagramHost

  if (container.dataset[BLOCK_DATA_SOURCE] === source) {
    return
  }

  container.dataset[BLOCK_DATA_SOURCE] = source
  container.dataset[BLOCK_DATA_STATUS] = 'rendering'
  registry.lastSvg = null
  registry.lastRenderId = undefined
  updateDownloadButtons(registry)

  const renderId = `coderchart-${diagramCounter++}`
  try {
    const { svg } = await mermaid.render(renderId, source)

    if (container.dataset[BLOCK_DATA_SOURCE] !== source) {
      cleanupGhostNodes(renderId, diagramHost.ownerDocument)
      return
    }

    diagramHost.innerHTML = svg
    container.dataset[BLOCK_DATA_STATUS] = 'rendered'
    registry.lastSvg = svg
    registry.lastRenderId = renderId
    updateDownloadButtons(registry)
    cleanupGhostNodes(renderId, diagramHost.ownerDocument)
  } catch (err) {
    if (container.dataset[BLOCK_DATA_SOURCE] !== source) {
      cleanupGhostNodes(renderId, diagramHost.ownerDocument)
      return
    }

    diagramHost.innerHTML = ''
    diagramHost.append(createErrorNotice(diagramHost.ownerDocument, err, source))
    container.dataset[BLOCK_DATA_STATUS] = 'error'
    registry.lastSvg = null
    registry.lastRenderId = undefined
    updateDownloadButtons(registry)
    cleanupGhostNodes(renderId, diagramHost.ownerDocument)
  }
}

function ensureContainer(pre: HTMLElement): BlockRegistryEntry {
  const existing = processedBlocks.get(pre)
  if (existing) {
    return existing
  }

  const doc = pre.ownerDocument
  const container = doc.createElement('div')
  const blockId = `coderchart-block-${blockIdentifierCounter++}`
  container.dataset['coderchartId'] = blockId
  container.dataset['coderchartContainer'] = 'true'
  container.style.marginTop = '0.75rem'
  container.style.border = getBorderColor()
  container.style.borderRadius = '0.75rem'
  container.style.overflow = 'hidden'

  const header = doc.createElement('div')
  header.style.display = 'flex'
  header.style.alignItems = 'center'
  header.style.justifyContent = 'space-between'
  header.style.padding = '0.65rem 0.85rem'
  header.style.background = getHeaderBackground()
  header.style.gap = '0.75rem'

  const title = doc.createElement('span')
  title.textContent = 'Mermaid diagram'
  title.style.fontWeight = '600'
  title.style.fontSize = '0.85rem'

  const actionGroup = doc.createElement('div')
  actionGroup.style.display = 'flex'
  actionGroup.style.alignItems = 'center'
  actionGroup.style.gap = '0.5rem'

  const collapseButton = createActionButton(doc, 'Hide diagram')

  const openRawButton = createActionButton(doc, 'Scroll to code')
  openRawButton.addEventListener('click', () => {
    pre.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })

  const downloadSvgButton = createActionButton(doc, 'Download SVG')
  downloadSvgButton.addEventListener('click', () => {
    handleDownloadSvg(pre)
  })

  const downloadPngButton = createActionButton(doc, 'Download PNG')
  downloadPngButton.addEventListener('click', () => {
    void handleDownloadPng(pre)
  })

  collapseButton.addEventListener('click', () => {
    const isHidden = container.dataset['collapsed'] === 'true'
    if (isHidden) {
      container.dataset['collapsed'] = 'false'
      collapseButton.textContent = 'Hide diagram'
    } else {
      container.dataset['collapsed'] = 'true'
      collapseButton.textContent = 'Show diagram'
    }
    updateCollapsedState(container)
  })

  actionGroup.append(collapseButton, openRawButton, downloadSvgButton, downloadPngButton)
  header.append(title, actionGroup)
  container.append(header)

  const body = doc.createElement('div')
  body.style.background = getBodyBackground()
  body.style.padding = '1rem'
  body.style.overflowX = 'auto'

  container.append(body)

  pre.insertAdjacentElement('afterend', container)

  const entry: BlockRegistryEntry = {
    id: blockId,
    container,
    diagramHost: body,
    collapseButton,
    downloadSvgButton,
    downloadPngButton,
    lastSvg: null,
  }
  processedBlocks.set(pre, entry)
  updateCollapsedState(container)
  updateDownloadButtons(entry)

  return entry
}

function updateCollapsedState(container: HTMLElement) {
  const isCollapsed = container.dataset['collapsed'] === 'true'
  const body = container.lastElementChild as HTMLElement | null
  if (!body) return
  body.style.display = isCollapsed ? 'none' : 'block'
}

function createActionButton(doc: Document, label: string): HTMLButtonElement {
  const button = doc.createElement('button')
  button.type = 'button'
  button.textContent = label
  button.dataset['coderchartLabel'] = label
  button.style.fontSize = '0.75rem'
  button.style.fontWeight = '500'
  button.style.padding = '0.25rem 0.75rem'
  button.style.borderRadius = '0.5rem'
  button.style.border = getButtonBorder()
  button.style.background = getButtonBackground()
  button.style.color = getPrimaryTextColor()
  button.style.cursor = 'pointer'
  button.style.transition = 'background 150ms ease, border 150ms ease'
  button.addEventListener('mouseenter', () => {
    button.style.background = getButtonHoverBackground()
  })
  button.addEventListener('mouseleave', () => {
    button.style.background = getButtonBackground()
  })
  return button
}

function getPrimaryTextColor(): string {
  return isDarkMode() ? 'rgba(226, 232, 240, 0.95)' : '#1f2937'
}

function getHeaderBackground(): string {
  return isDarkMode() ? 'rgba(30, 41, 59, 0.85)' : 'rgba(241, 245, 249, 0.9)'
}

function getBodyBackground(): string {
  return isDarkMode() ? 'rgba(15, 23, 42, 0.85)' : '#ffffff'
}

function getBorderColor(): string {
  return isDarkMode()
    ? '1px solid rgba(148, 163, 184, 0.25)'
    : '1px solid rgba(148, 163, 184, 0.4)'
}

function getButtonBackground(): string {
  return isDarkMode() ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.15)'
}

function getButtonHoverBackground(): string {
  return isDarkMode() ? 'rgba(148, 163, 184, 0.35)' : 'rgba(148, 163, 184, 0.25)'
}

function getButtonBorder(): string {
  return isDarkMode()
    ? '1px solid rgba(148, 163, 184, 0.35)'
    : '1px solid rgba(148, 163, 184, 0.4)'
}

function extractSource(code: HTMLElement): string {
  const rawText = code.textContent ?? ''
  return rawText.replace(/\u200B/g, '').trim()
}

async function configureMermaid() {
  const mermaid = await ensureMermaid()
  mermaid.initialize({
    startOnLoad: false,
    theme: isDarkMode() ? 'dark' : 'default',
    securityLevel: 'loose',
  })
  refreshContainerStyles()
}

function isDarkMode(): boolean {
  if (document.documentElement.classList.contains('dark')) {
    return true
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

async function ensureDomReady() {
  if (document.readyState === 'loading') {
    await new Promise<void>((resolve) => {
      document.addEventListener('DOMContentLoaded', () => resolve(), { once: true })
    })
  }
  if (!document.body) {
    await new Promise<void>((resolve) => {
      const bodyObserver = new MutationObserver(() => {
        if (document.body) {
          bodyObserver.disconnect()
          resolve()
        }
      })
      bodyObserver.observe(document.documentElement, { childList: true })
    })
  }
}

function cleanupGhostNodes(renderId: string, doc: Document) {
  doc
    .querySelectorAll(`[id^="d${renderId}"]`)
    .forEach((node) => node.remove())
}

function updateDownloadButtons(entry: BlockRegistryEntry) {
  const hasRenderableSvg = Boolean(entry.lastSvg)
  entry.downloadSvgButton.disabled = !hasRenderableSvg
  entry.downloadPngButton.disabled = !hasRenderableSvg
}

function handleDownloadSvg(pre: HTMLElement) {
  const entry = processedBlocks.get(pre)
  if (!entry || !entry.lastSvg) {
    return
  }

  const blob = new Blob([entry.lastSvg], { type: 'image/svg+xml;charset=utf-8' })
  triggerDownload(blob, buildFilename(entry, 'svg'))
}

async function handleDownloadPng(pre: HTMLElement) {
  const entry = processedBlocks.get(pre)
  if (!entry || !entry.lastSvg) {
    return
  }

  const button = entry.downloadPngButton
  const defaultLabel = button.dataset['coderchartLabel'] || 'Download PNG'
  button.disabled = true
  button.textContent = PNG_PREPARING_LABEL

  try {
    const pngBlob = await convertSvgToPng(entry.lastSvg)
    triggerDownload(pngBlob, buildFilename(entry, 'png'))
  } catch (err) {
    console.warn('Failed to export diagram as PNG', err)
  } finally {
    button.textContent = defaultLabel
    updateDownloadButtons(entry)
  }
}

function buildFilename(entry: BlockRegistryEntry, extension: string): string {
  const base = entry.lastRenderId || entry.id
  return `${base}.${extension}`
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

async function convertSvgToPng(svgContent: string): Promise<Blob> {
  const { width, height } = extractSvgDimensions(svgContent)
  const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  try {
    const image = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Canvas 2D context is not available')
    }

    context.drawImage(image, 0, 0, width, height)

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to create PNG blob from canvas'))
        }
      }, 'image/png')
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

function extractSvgDimensions(svgContent: string): { width: number; height: number } {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgContent, 'image/svg+xml')
  const svgElement = doc.documentElement

  const viewBoxValue = svgElement.getAttribute('viewBox')
  let viewBoxWidth: number | null = null
  let viewBoxHeight: number | null = null

  if (viewBoxValue) {
    const parts = viewBoxValue
      .split(/[ ,]+/)
      .map((part) => Number(part))
      .filter((num) => Number.isFinite(num))

    if (parts.length >= 4) {
      viewBoxWidth = parts[2]
      viewBoxHeight = parts[3]
    }
  }

  let width = parseSvgSize(svgElement.getAttribute('width')) ?? viewBoxWidth ?? 1024
  let height = parseSvgSize(svgElement.getAttribute('height')) ?? viewBoxHeight ?? Math.round((width * 2) / 3)

  if ((!svgElement.getAttribute('width') || parseSvgSize(svgElement.getAttribute('width')) === null) && viewBoxWidth && viewBoxHeight) {
    width = viewBoxWidth
    height = viewBoxHeight
  }

  width = Math.max(1, Math.round(width))
  height = Math.max(1, Math.round(height))

  return { width, height }
}

function parseSvgSize(value: string | null): number | null {
  if (!value) {
    return null
  }

  const match = value.trim().match(/^[0-9]+(?:\.[0-9]+)?/)
  if (!match) {
    return null
  }

  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : null
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Failed to load SVG for export'))
    image.src = url
  })
}

function createErrorNotice(doc: Document, err: unknown, source: string): HTMLElement {
  const wrapper = doc.createElement('div')
  wrapper.style.display = 'flex'
  wrapper.style.flexDirection = 'column'
  wrapper.style.gap = '0.5rem'

  const title = doc.createElement('p')
  title.textContent = RENDER_HARD_FAIL_NOTICE
  title.style.margin = '0'
  title.style.fontWeight = '600'
  title.style.color = isDarkMode() ? '#f87171' : '#b91c1c'

  const details = doc.createElement('pre')
  const errorMessage = err instanceof Error ? err.message : String(err)
  details.textContent = errorMessage
  details.style.margin = '0'
  details.style.whiteSpace = 'pre-wrap'
  details.style.fontSize = '0.75rem'
  details.style.padding = '0.75rem'
  details.style.borderRadius = '0.5rem'
  details.style.border = isDarkMode() ? '1px solid rgba(248, 113, 113, 0.3)' : '1px solid rgba(248, 113, 113, 0.5)'
  details.style.background = isDarkMode() ? 'rgba(30, 41, 59, 0.85)' : 'rgba(254, 226, 226, 0.9)'

  const hint = doc.createElement('p')
  hint.textContent = 'Check the Mermaid syntax and try again.'
  hint.style.margin = '0'
  hint.style.fontSize = '0.75rem'
  hint.style.color = isDarkMode() ? 'rgba(226, 232, 240, 0.75)' : '#6b7280'

  const promptSection = doc.createElement('div')
  promptSection.style.display = 'flex'
  promptSection.style.flexDirection = 'column'
  promptSection.style.gap = '0.35rem'

  const promptButton = createActionButton(doc, 'Copy fix prompt')
  promptButton.style.alignSelf = 'flex-start'

  const promptStatus = doc.createElement('span')
  promptStatus.style.margin = '0'
  promptStatus.style.fontSize = '0.7rem'
  promptStatus.style.display = 'none'

  const promptText = buildMermaidFixPrompt(errorMessage, source)

  const promptPreview = doc.createElement('textarea')
  promptPreview.value = promptText
  promptPreview.readOnly = true
  promptPreview.spellcheck = false
  promptPreview.rows = Math.min(12, Math.max(4, promptText.split('\n').length + 1))
  promptPreview.style.display = 'none'
  promptPreview.style.width = '100%'
  promptPreview.style.padding = '0.75rem'
  promptPreview.style.borderRadius = '0.5rem'
  promptPreview.style.border = getBorderColor()
  promptPreview.style.background = isDarkMode() ? 'rgba(30, 41, 59, 0.85)' : 'rgba(248, 250, 252, 0.9)'
  promptPreview.style.color = getPrimaryTextColor()
  promptPreview.style.fontSize = '0.75rem'
  promptPreview.style.lineHeight = '1.4'
  promptPreview.style.fontFamily =
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
  promptPreview.style.resize = 'vertical'

  const defaultLabel = promptButton.dataset['coderchartLabel'] || 'Copy fix prompt'

  promptButton.addEventListener('click', async () => {
    promptButton.disabled = true
    promptButton.textContent = 'Copying...'
    promptPreview.style.display = 'block'

    const copied = await copyTextToClipboard(doc, promptText)

    promptStatus.style.display = 'block'
    if (copied) {
      promptStatus.textContent = 'Prompt copied to your clipboard. Paste it back into ChatGPT to request a fix.'
      promptStatus.style.color = isDarkMode() ? 'rgba(134, 239, 172, 0.9)' : '#166534'
      promptButton.textContent = 'Prompt copied!'
    } else {
      promptStatus.textContent = 'Clipboard access was blocked. Copy the prompt below manually.'
      promptStatus.style.color = isDarkMode() ? 'rgba(248, 113, 113, 0.9)' : '#b91c1c'
      promptButton.textContent = 'Copy fix prompt'
      promptPreview.focus()
      promptPreview.select()
    }

    setTimeout(() => {
      promptButton.disabled = false
      promptButton.textContent = defaultLabel
    }, 2000)
  })

  promptSection.append(promptButton, promptStatus, promptPreview)

  wrapper.append(title, details, hint, promptSection)
  return wrapper
}

function buildMermaidFixPrompt(errorMessage: string, source: string): string {
  const trimmedSource = source.trim()
  const formattedSource = trimmedSource ? `\n\n\`\`\`mermaid\n${trimmedSource}\n\`\`\`` : ''
  return (
    'The Mermaid diagram you generated could not be rendered by the CoderChart extension.' +
    `\nParse error: ${errorMessage}` +
    '\nPlease acknowledge that your earlier response included invalid Mermaid syntax and provide a corrected diagram.' +
    '\nRespond with only the Mermaid code block using valid Mermaid syntax.' +
    (formattedSource
      ? `${formattedSource}\n`
      : '\nIf you need the original code, please restate it before sending the fix.\n')
  )
}

async function copyTextToClipboard(doc: Document, text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (err) {
      console.warn('Failed to copy prompt via navigator.clipboard', err)
    }
  }

  if (!doc.body) {
    return false
  }

  const textarea = doc.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  textarea.style.pointerEvents = 'none'
  textarea.style.top = '0'
  textarea.style.left = '0'
  doc.body.appendChild(textarea)
  textarea.focus()
  textarea.select()

  let copied = false
  try {
    copied = doc.execCommand('copy')
  } catch (err) {
    console.warn('Failed to copy prompt via execCommand', err)
  }

  textarea.remove()
  return copied
}

function clearRenderedBlocks() {
  processedBlocks.forEach((entry) => {
    entry.container.remove()
  })
  processedBlocks.clear()
}

function refreshContainerStyles() {
  processedBlocks.forEach((entry) => {
    entry.container.style.border = getBorderColor()
    const header = entry.container.firstElementChild as HTMLElement | null
    if (header) {
      header.style.background = getHeaderBackground()
      header.style.color = getPrimaryTextColor()
    }
    entry.diagramHost.style.background = getBodyBackground()
    entry.container.querySelectorAll('button').forEach((element) => {
      const button = element as HTMLButtonElement
      button.style.border = getButtonBorder()
      button.style.background = getButtonBackground()
      button.style.color = getPrimaryTextColor()
    })
  })
}
