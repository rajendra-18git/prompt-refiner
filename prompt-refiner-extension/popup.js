/**
 * Nova AI – Prompt Refiner (Manifest V3)
 * High-precision prompt refiner supporting Groq (Ultra-Fast), Anthropic, OpenAI,
 * Google Gemini, OpenRouter, DeepSeek, and Custom/Local endpoints.
 */

// Storage Keys
const STORAGE_KEYS = {
  LEGACY_API_KEY: 'anthropic_api_key',
  SELECTED_PROVIDER: 'selected_provider',
  PROVIDER_KEYS: 'provider_keys',
  CUSTOM_ENDPOINTS: 'custom_endpoints',
  SELECTED_STYLE: 'selected_style',
  DRAFT_PROMPT: 'draft_prompt'
};

// Provider Presets and API Details
const PROVIDERS = {
  groq: {
    name: 'Groq',
    badge: 'Groq',
    defaultModel: 'llama-3.1-8b-instant',
    placeholderKey: 'gsk_...',
    keyLabel: 'Groq API key',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    requiresCustomEndpoint: false,
    format: 'openai'
  },
  anthropic: {
    name: 'Anthropic (Claude)',
    badge: 'Claude',
    defaultModel: 'claude-sonnet-5-5',
    placeholderKey: 'sk-ant-api03-...',
    keyLabel: 'Anthropic API key',
    endpoint: 'https://api.anthropic.com/v1/messages',
    requiresCustomEndpoint: false,
    format: 'anthropic'
  },
  openai: {
    name: 'OpenAI (ChatGPT)',
    badge: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    placeholderKey: 'sk-proj-...',
    keyLabel: 'OpenAI API key',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    requiresCustomEndpoint: false,
    format: 'openai'
  },
  gemini: {
    name: 'Google Gemini',
    badge: 'Gemini',
    defaultModel: 'gemini-2.0-flash',
    placeholderKey: 'AIzaSy...',
    keyLabel: 'Gemini API key',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    requiresCustomEndpoint: false,
    format: 'openai'
  },
  openrouter: {
    name: 'OpenRouter',
    badge: 'OpenRouter',
    defaultModel: 'nvidia/nemotron-3.5-lightning:free',
    placeholderKey: 'sk-or-v1-...',
    keyLabel: 'OpenRouter API key',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    requiresCustomEndpoint: false,
    format: 'openai'
  },
  deepseek: {
    name: 'DeepSeek',
    badge: 'DeepSeek',
    defaultModel: 'deepseek-chat',
    placeholderKey: 'sk-...',
    keyLabel: 'DeepSeek API key',
    endpoint: 'https://api.deepseek.com/chat/completions',
    requiresCustomEndpoint: false,
    format: 'openai'
  },
  custom: {
    name: 'Custom / Local',
    badge: 'Custom',
    defaultModel: 'llama3',
    placeholderKey: 'Optional for local (e.g. ollama)',
    keyLabel: 'API key (optional)',
    endpoint: 'http://localhost:11434/v1/chat/completions',
    requiresCustomEndpoint: true,
    format: 'openai'
  }
};

// Style Instructions appended to System Prompt
const STYLE_INSTRUCTIONS = {
  clearer: 'Focus on clarity, eliminating ambiguity, and sharpening the core instruction so expectations are unambiguous.',
  detailed: 'Expand the prompt with necessary context, constraints, step-by-step guidance, and edge cases to ensure a comprehensive response.',
  shorter: 'Make the prompt concise, punchy, and direct while retaining all critical directives and requirements.',
  coding: 'Structure the prompt specifically for software engineering tasks, detailing technology stack, architecture requirements, edge cases, error handling, and clean code standards.',
  writing: 'Optimize the prompt for high quality writing, specifying the intended tone, audience, voice, stylistic nuance, and structural outline.'
};

// Base System Prompt
const BASE_SYSTEM_PROMPT = "You are an expert prompt engineer. Rewrite the user's prompt so an AI model gives the best possible result. Keep the user's intent. Do not answer the prompt. Return only the improved prompt, with no preface or commentary.";

// State Objects
let currentProvider = 'groq';
let providerKeys = {};
let customEndpoints = {};
let isRefining = false; // Prevent concurrent in-flight requests

// DOM Elements
let toggleSettingsBtn;
let settingsPanel;
let activeProviderPill;
let providerSelect;
let endpointFieldGroup;
let endpointInput;
let apiKeyInputLabel;
let apiKeyInput;
let toggleKeyVisibilityBtn;
let saveKeyBtn;
let apiKeyBadge;
let apiKeyStatus;
let styleChips;
let promptInput;
let charCount;
let clearDraftBtn;
let refineBtn;
let refineBtnText;
let spinner;
let refineIcon;
let copyBtn;
let copyBtnText;
let outputPanel;
let emptyState;
let outputContentWrapper;
let outputText;
let errorContainer;
let errorTitle;
let errorMessage;

// Debounce timer for auto-saving drafts
let draftSaveTimer = null;
// Copy feedback timer
let copyResetTimer = null;

/**
 * Initialize extension when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
  cacheDOMElements();
  setupEventListeners();
  await loadStoredState();
});

/**
 * Cache all necessary DOM elements
 */
function cacheDOMElements() {
  toggleSettingsBtn = document.getElementById('toggleSettingsBtn');
  settingsPanel = document.getElementById('settingsPanel');
  activeProviderPill = document.getElementById('activeProviderPill');
  providerSelect = document.getElementById('providerSelect');
  endpointFieldGroup = document.getElementById('endpointFieldGroup');
  endpointInput = document.getElementById('endpointInput');
  apiKeyInputLabel = document.getElementById('apiKeyInputLabel');
  apiKeyInput = document.getElementById('apiKeyInput');
  toggleKeyVisibilityBtn = document.getElementById('toggleKeyVisibilityBtn');
  saveKeyBtn = document.getElementById('saveKeyBtn');
  apiKeyBadge = document.getElementById('apiKeyBadge');
  apiKeyStatus = document.getElementById('apiKeyStatus');
  styleChips = document.getElementById('styleChips');
  promptInput = document.getElementById('promptInput');
  charCount = document.getElementById('charCount');
  clearDraftBtn = document.getElementById('clearDraftBtn');
  refineBtn = document.getElementById('refineBtn');
  refineBtnText = document.getElementById('refineBtnText');
  spinner = document.getElementById('spinner');
  refineIcon = document.getElementById('refineIcon');
  copyBtn = document.getElementById('copyBtn');
  copyBtnText = document.getElementById('copyBtnText');
  outputPanel = document.getElementById('outputPanel');
  emptyState = document.getElementById('emptyState');
  outputContentWrapper = document.getElementById('outputContentWrapper');
  outputText = document.getElementById('outputText');
  errorContainer = document.getElementById('errorContainer');
  errorTitle = document.getElementById('errorTitle');
  errorMessage = document.getElementById('errorMessage');
}

/**
 * Attach event listeners to UI components
 */
function setupEventListeners() {
  // Settings toggle
  toggleSettingsBtn.addEventListener('click', toggleSettings);

  // Provider change
  providerSelect.addEventListener('change', handleProviderChange);

  // Password visibility toggle
  toggleKeyVisibilityBtn.addEventListener('click', toggleKeyVisibility);

  // Save Settings
  saveKeyBtn.addEventListener('click', handleSaveSettings);
  apiKeyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveSettings();
    }
  });

  // Style chips selection
  styleChips.addEventListener('click', handleStyleSelection);
  styleChips.addEventListener('keydown', handleStyleKeyboardNavigation);

  // Prompt input: character counter & draft persistence
  promptInput.addEventListener('input', handlePromptInput);

  // Real-time API key auto-saving
  apiKeyInput.addEventListener('input', handleApiKeyInput);
  endpointInput.addEventListener('input', handleEndpointInput);

  // Keyboard shortcut: Ctrl+Enter / Cmd+Enter to refine
  promptInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRefinePrompt();
    }
  });

  // Clear draft button
  clearDraftBtn.addEventListener('click', handleClearDraft);

  // Refine action button
  refineBtn.addEventListener('click', handleRefinePrompt);

  // Copy to clipboard
  copyBtn.addEventListener('click', handleCopy);
}

/**
 * Load saved configuration & draft from chrome.storage.local
 */
async function loadStoredState() {
  try {
    const data = await getFromStorage([
      STORAGE_KEYS.LEGACY_API_KEY,
      STORAGE_KEYS.SELECTED_PROVIDER,
      STORAGE_KEYS.PROVIDER_KEYS,
      STORAGE_KEYS.CUSTOM_ENDPOINTS,
      STORAGE_KEYS.SELECTED_STYLE,
      STORAGE_KEYS.DRAFT_PROMPT
    ]);

    // 1. Providers and Keys
    currentProvider = data[STORAGE_KEYS.SELECTED_PROVIDER] || 'groq';
    providerKeys = data[STORAGE_KEYS.PROVIDER_KEYS] || {};
    customEndpoints = data[STORAGE_KEYS.CUSTOM_ENDPOINTS] || {};

    // Backward compatibility migration for legacy Anthropic key
    if (data[STORAGE_KEYS.LEGACY_API_KEY] && !providerKeys.anthropic) {
      providerKeys.anthropic = data[STORAGE_KEYS.LEGACY_API_KEY];
    }

    // Set Provider UI
    providerSelect.value = currentProvider;
    updateProviderUI(currentProvider);

    const hasCurrentKey = Boolean(providerKeys[currentProvider]) || currentProvider === 'custom';
    if (!hasCurrentKey) {
      // First run or missing key: automatically expand settings panel
      settingsPanel.hidden = false;
      toggleSettingsBtn.setAttribute('aria-expanded', 'true');
    } else {
      settingsPanel.hidden = true;
      toggleSettingsBtn.setAttribute('aria-expanded', 'false');
    }

    // 2. Selected Style
    const savedStyle = data[STORAGE_KEYS.SELECTED_STYLE] || 'clearer';
    setActiveStyleChip(savedStyle);

    // 3. Draft Prompt
    if (data[STORAGE_KEYS.DRAFT_PROMPT]) {
      promptInput.value = data[STORAGE_KEYS.DRAFT_PROMPT];
      updateCharCount(promptInput.value.length);
    }
  } catch (error) {
    showError('Could not load stored extension settings: ' + (error.message || error), 'Configuration error');
  }
}

/**
 * Handle Provider dropdown change
 */
async function handleProviderChange() {
  currentProvider = providerSelect.value;
  updateProviderUI(currentProvider);
  try {
    await saveToStorage({ [STORAGE_KEYS.SELECTED_PROVIDER]: currentProvider });
  } catch (err) {
    console.error('Failed to persist provider selection:', err);
  }
}

/**
 * Handle Real-time API Key typing/pasting and auto-save
 */
async function handleApiKeyInput() {
  const key = apiKeyInput.value.trim();
  const provider = currentProvider;

  if (key) {
    providerKeys[provider] = key;
  } else {
    delete providerKeys[provider];
  }

  updateKeyBadge(Boolean(key) || provider === 'custom');

  try {
    await saveToStorage({ [STORAGE_KEYS.PROVIDER_KEYS]: providerKeys });
  } catch (err) {
    console.error('Failed to auto-save API key:', err);
  }
}

/**
 * Handle Custom API Endpoint typing and auto-save
 */
async function handleEndpointInput() {
  const endpoint = endpointInput.value.trim();
  const provider = currentProvider;

  if (endpoint) {
    customEndpoints[provider] = endpoint;
  }

  try {
    await saveToStorage({ [STORAGE_KEYS.CUSTOM_ENDPOINTS]: customEndpoints });
  } catch (err) {
    console.error('Failed to auto-save custom endpoint:', err);
  }
}

/**
 * Update Provider-specific UI fields (endpoint, placeholder, key)
 */
function updateProviderUI(providerKey) {
  const provider = PROVIDERS[providerKey] || PROVIDERS.groq;

  // Active provider pill badge in header
  activeProviderPill.textContent = provider.badge;

  // Endpoint group visibility & value
  if (provider.requiresCustomEndpoint) {
    endpointFieldGroup.hidden = false;
    endpointInput.value = customEndpoints[providerKey] || provider.endpoint;
  } else {
    endpointFieldGroup.hidden = true;
  }

  // API Key Label, Placeholder, and Value
  apiKeyInputLabel.textContent = provider.keyLabel;
  apiKeyInput.placeholder = provider.placeholderKey;
  apiKeyInput.value = providerKeys[providerKey] || '';

  // Status Badge
  const hasKey = Boolean(providerKeys[providerKey]) || providerKey === 'custom';
  updateKeyBadge(hasKey);
}

/**
 * Toggle settings panel visibility
 */
function toggleSettings() {
  const isExpanded = settingsPanel.hidden;
  settingsPanel.hidden = !isExpanded;
  toggleSettingsBtn.setAttribute('aria-expanded', String(isExpanded));
  if (isExpanded) {
    apiKeyInput.focus();
  }
}

/**
 * Toggle visibility of API key password input
 */
function toggleKeyVisibility() {
  const isPassword = apiKeyInput.type === 'password';
  apiKeyInput.type = isPassword ? 'text' : 'password';
  toggleKeyVisibilityBtn.setAttribute('aria-label', isPassword ? 'Hide API key' : 'Show API key');
  toggleKeyVisibilityBtn.title = isPassword ? 'Hide API key' : 'Show API key';

  toggleKeyVisibilityBtn.innerHTML = isPassword
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
}

/**
 * Save settings (Provider, Key, Endpoint) to chrome.storage.local
 */
async function handleSaveSettings() {
  const provider = currentProvider;
  const key = apiKeyInput.value.trim();
  const endpoint = endpointInput.value.trim() || PROVIDERS[provider].endpoint;

  if (provider !== 'custom' && !key) {
    apiKeyStatus.textContent = 'Please enter an API key for ' + PROVIDERS[provider].name;
    apiKeyStatus.style.color = 'var(--status-error-text)';
    apiKeyInput.focus();
    return;
  }

  // Update in-memory state
  if (key) {
    providerKeys[provider] = key;
  } else {
    delete providerKeys[provider];
  }
  if (PROVIDERS[provider].requiresCustomEndpoint) {
    customEndpoints[provider] = endpoint;
  }

  try {
    await saveToStorage({
      [STORAGE_KEYS.SELECTED_PROVIDER]: provider,
      [STORAGE_KEYS.PROVIDER_KEYS]: providerKeys,
      [STORAGE_KEYS.CUSTOM_ENDPOINTS]: customEndpoints
    });

    updateKeyBadge(Boolean(key) || provider === 'custom');
    apiKeyStatus.textContent = 'Settings saved successfully.';
    apiKeyStatus.style.color = 'var(--status-success-text)';

    setTimeout(() => {
      apiKeyStatus.textContent = '';
      settingsPanel.hidden = true;
      toggleSettingsBtn.setAttribute('aria-expanded', 'false');
    }, 1100);
  } catch (error) {
    apiKeyStatus.textContent = 'Failed to save settings: ' + (error.message || error);
    apiKeyStatus.style.color = 'var(--status-error-text)';
  }
}

/**
 * Update visual status badge for key configuration
 */
function updateKeyBadge(hasKey) {
  if (hasKey) {
    apiKeyBadge.textContent = 'Key configured';
    apiKeyBadge.className = 'status-pill status-pill-saved';
  } else {
    apiKeyBadge.textContent = 'No key saved';
    apiKeyBadge.className = 'status-pill status-pill-empty';
  }
}

/**
 * Handle Style chip click
 */
async function handleStyleSelection(e) {
  const chip = e.target.closest('.chip-btn');
  if (!chip) return;

  const style = chip.dataset.style;
  setActiveStyleChip(style);

  try {
    await saveToStorage({ [STORAGE_KEYS.SELECTED_STYLE]: style });
  } catch (error) {
    console.error('Failed to save style selection:', error);
  }
}

/**
 * Handle keyboard arrow navigation between style chips
 */
function handleStyleKeyboardNavigation(e) {
  const chips = Array.from(styleChips.querySelectorAll('.chip-btn'));
  const activeIndex = chips.findIndex((chip) => chip.classList.contains('active'));

  let nextIndex = activeIndex;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault();
    nextIndex = (activeIndex + 1) % chips.length;
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault();
    nextIndex = (activeIndex - 1 + chips.length) % chips.length;
  }

  if (nextIndex !== activeIndex) {
    chips[nextIndex].focus();
    chips[nextIndex].click();
  }
}

/**
 * Set active style chip in UI
 */
function setActiveStyleChip(style) {
  const chips = styleChips.querySelectorAll('.chip-btn');
  chips.forEach((chip) => {
    const isActive = chip.dataset.style === style;
    chip.classList.toggle('active', isActive);
    chip.setAttribute('aria-checked', String(isActive));
  });
}

/**
 * Handle prompt input typing, update counter, and debounce storage save
 */
function handlePromptInput() {
  const text = promptInput.value;
  updateCharCount(text.length);

  clearTimeout(draftSaveTimer);
  draftSaveTimer = setTimeout(async () => {
    try {
      await saveToStorage({ [STORAGE_KEYS.DRAFT_PROMPT]: text });
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  }, 150);
}

/**
 * Update character counter display
 */
function updateCharCount(length) {
  charCount.textContent = `${length} char${length === 1 ? '' : 's'}`;
}

/**
 * Clear draft textarea and persisted draft
 */
async function handleClearDraft() {
  promptInput.value = '';
  updateCharCount(0);
  promptInput.focus();

  try {
    await saveToStorage({ [STORAGE_KEYS.DRAFT_PROMPT]: '' });
  } catch (error) {
    console.error('Failed to clear stored draft:', error);
  }
}

/**
 * Call the selected AI Provider API to refine the prompt
 */
async function handleRefinePrompt() {
  // Prevent duplicate requests while refinement is already in progress
  if (isRefining) {
    return;
  }

  const providerKey = currentProvider;
  const providerConfig = PROVIDERS[providerKey] || PROVIDERS.groq;

  // 1. Validation: API Key (check input box value or saved storage)
  const inputKey = apiKeyInput.value.trim();
  let apiKey = (inputKey || providerKeys[providerKey] || '').trim();

  // Auto-sync into memory & storage if provided in input
  if (inputKey && inputKey !== providerKeys[providerKey]) {
    providerKeys[providerKey] = inputKey;
    saveToStorage({ [STORAGE_KEYS.PROVIDER_KEYS]: providerKeys }).catch(console.error);
    updateKeyBadge(true);
  }

  if (providerKey !== 'custom' && !apiKey) {
    settingsPanel.hidden = false;
    toggleSettingsBtn.setAttribute('aria-expanded', 'true');
    apiKeyInput.focus();
    showError(`Please enter your ${providerConfig.name} API key in settings.`, 'API key required');
    return;
  }

  // 2. Validation: Input text
  const userPrompt = promptInput.value.trim();
  if (!userPrompt) {
    promptInput.focus();
    showError('Please enter a rough prompt to refine.', 'Empty prompt');
    return;
  }

  // 3. Prepare Model, Endpoint, and Prompts
  let modelName = providerConfig.defaultModel;
  const endpointUrl = providerConfig.requiresCustomEndpoint
    ? (customEndpoints[providerKey] || providerConfig.endpoint)
    : providerConfig.endpoint;

  const activeChip = styleChips.querySelector('.chip-btn.active');
  const selectedStyle = activeChip ? activeChip.dataset.style : 'clearer';
  const styleInstruction = STYLE_INSTRUCTIONS[selectedStyle] || STYLE_INSTRUCTIONS.clearer;
  const fullSystemPrompt = `${BASE_SYSTEM_PROMPT}\n\nAdditional style directive: ${styleInstruction}`;

  // 4. Set Loading & In-Flight State
  isRefining = true;
  setLoadingState(true);
  clearOutputAndError();

  try {
    // Dynamically resolve working model for Groq/OpenRouter
    if (providerKey === 'groq') {
      const discoveredModel = await resolveGroqModel(apiKey);
      if (discoveredModel) {
        modelName = discoveredModel;
      }
    }

    let refinedText = await executeRefineRequest(
      providerKey,
      providerConfig,
      endpointUrl,
      apiKey,
      modelName,
      fullSystemPrompt,
      userPrompt
    );

    if (typeof refinedText === 'string' && refinedText.trim().length > 0) {
      displayRefinedResult(refinedText.trim());
    } else {
      showError('The model returned an empty or unexpected response format.', 'Empty response');
    }
  } catch (error) {
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (isOffline) {
      showError('Network connection lost. Please check your internet connection.', 'Offline');
    } else {
      showError(
        error.message || `Failed to refine prompt with ${providerConfig.name}.`,
        error.title || 'Refinement failed'
      );
    }
  } finally {
    isRefining = false;
    setLoadingState(false);
  }
}

/**
 * Dynamically discover available active chat models from Groq account
 */
async function resolveGroqModel(apiKey) {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) return null;
    const json = await response.json();
    const modelList = (json?.data || [])
      .map((m) => m.id)
      .filter((id) => id && !id.includes('whisper') && !id.includes('embed') && !id.includes('guard') && !id.includes('safeguard'));

    const preferred = [
      'llama-3.3-70b-versatile',
      'llama-3.3-70b-specdec',
      'llama-3.1-70b-versatile',
      'llama3-70b-8192',
      'deepseek-r1-distill-llama-70b',
      'qwen-2.5-32b',
      'qwen-2.5-coder-32b',
      'llama-3.1-8b-instant',
      'llama3-8b-8192',
      'mixtral-8x7b-32768',
      'gemma2-9b-it'
    ];

    for (const p of preferred) {
      if (modelList.includes(p)) {
        return p;
      }
    }

    return modelList[0] || null;
  } catch (e) {
    console.warn('Dynamic Groq model lookup failed:', e);
    return null;
  }
}

/**
 * Execute API request with automatic retry if model 404 occurs
 */
async function executeRefineRequest(
  providerKey,
  providerConfig,
  endpointUrl,
  apiKey,
  modelName,
  fullSystemPrompt,
  userPrompt,
  retryCount = 0
) {
  let response;

  if (providerConfig.format === 'anthropic') {
    response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 1500,
        system: fullSystemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });
  } else {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    if (providerKey === 'openrouter') {
      headers['HTTP-Referer'] = 'https://nova-ai.local';
      headers['X-Title'] = 'Nova AI Prompt Refiner';
    }

    response = await fetch(endpointUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: fullSystemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });
  }

  let responseData = null;
  try {
    responseData = await response.json();
  } catch (jsonErr) {
    if (!response.ok) {
      const err = new Error(`Server returned HTTP ${response.status} (${response.statusText})`);
      err.title = 'Server error';
      throw err;
    }
    const err = new Error('Received malformed response from the server.');
    err.title = 'Response parsing error';
    throw err;
  }

  // If 404 Model Error on Groq, attempt auto-fallback retry with another model
  if (!response.ok) {
    if (response.status === 404 && providerKey === 'groq' && retryCount === 0) {
      const fallbackModel = await resolveGroqModel(apiKey);
      if (fallbackModel && fallbackModel !== modelName) {
        return await executeRefineRequest(
          providerKey,
          providerConfig,
          endpointUrl,
          apiKey,
          fallbackModel,
          fullSystemPrompt,
          userPrompt,
          retryCount + 1
        );
      }
    }

    const rawMsg = responseData?.error?.message 
      || responseData?.error 
      || responseData?.message 
      || `HTTP ${response.status}`;

    const err = new Error(`${providerConfig.badge} API Error (${response.status}): ${rawMsg}`);
    err.title = `API Error (${response.status})`;
    throw err;
  }

  if (providerConfig.format === 'anthropic') {
    return responseData?.content?.[0]?.text;
  }
  return responseData?.choices?.[0]?.message?.content;
}

/**
 * Contextual HTTP Status Error Handler for Groq, OpenAI, Anthropic, etc.
 */
function handleHttpStatusError(status, responseData, providerConfig, modelName) {
  const rawMsg = responseData?.error?.message 
    || responseData?.error 
    || responseData?.message 
    || `HTTP ${status}`;

  switch (status) {
    case 400:
      showError(
        `${providerConfig.badge} Bad Request (400): ${rawMsg}.`,
        'Bad request'
      );
      break;

    case 401:
      showError(
        `${providerConfig.badge} Authentication Error (401): Invalid or expired API key. Please verify your key in Settings.`,
        'Invalid API key'
      );
      break;

    case 403:
      showError(
        `${providerConfig.badge} Forbidden (403): Your API key does not have permission to access model '${modelName}'.`,
        'Access forbidden'
      );
      break;

    case 404:
      showError(
        `${providerConfig.badge} Not Found (404): The model '${modelName}' or endpoint was not found. Details: ${rawMsg}`,
        'Resource not found (404)'
      );
      break;

    case 429:
      showError(
        `${providerConfig.badge} Rate Limit Exceeded (429): Too many requests or token quota reached. Please wait a moment and try again.`,
        'Rate limit reached'
      );
      break;

    case 500:
    case 502:
    case 503:
    case 504:
      showError(
        `${providerConfig.badge} Server Error (${status}): The provider service is temporarily experiencing issues. Please try again shortly.`,
        'Service unavailable'
      );
      break;

    default:
      showError(
        `${providerConfig.badge} API Error (${status}): ${rawMsg}`,
        `API Error (${status})`
      );
      break;
  }
}

/**
 * Set loading UI state
 */
function setLoadingState(isLoading) {
  refineBtn.disabled = isLoading;
  spinner.hidden = !isLoading;
  refineIcon.hidden = isLoading;
  refineBtnText.textContent = isLoading ? 'Refining prompt...' : 'Refine prompt';
  refineBtn.setAttribute('aria-busy', String(isLoading));
}

// Store raw refined text for clean clipboard copying
let currentRawRefinedPrompt = '';

/**
 * Format markdown safely with highlighted bold ** marks and code blocks
 */
function renderFormattedPrompt(text) {
  if (!text) return '';

  // 1. Escape HTML entities to prevent any XSS
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // 2. Format markdown bold with radiant teal ** marks and pure white text
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong class="md-bold"><span class="md-mark">**</span>$1<span class="md-mark">**</span></strong>');

  // 3. Format inline code `code`
  escaped = escaped.replace(/`([^`]+)`/g, '<code class="md-code">$1</code>');

  // 4. Format markdown headers (### or ##)
  escaped = escaped.replace(/(?:^|\n)(#{1,4})\s+(.+)/g, '\n<span class="md-heading"><span class="md-mark">$1</span> $2</span>');

  return escaped;
}

/**
 * Display refined result in output panel
 */
function displayRefinedResult(text) {
  currentRawRefinedPrompt = text;
  emptyState.hidden = true;
  errorContainer.hidden = true;
  outputContentWrapper.hidden = false;
  copyBtn.hidden = false;

  // Render formatted markdown with glowing visible ** marks
  outputText.innerHTML = renderFormattedPrompt(text);

  // Scroll output to top
  outputPanel.scrollTop = 0;
}

/**
 * Show error message in output panel
 */
function showError(msg, title = 'Unable to refine prompt') {
  emptyState.hidden = true;
  outputContentWrapper.hidden = true;
  copyBtn.hidden = true;
  errorContainer.hidden = false;

  // Use textContent for safe text rendering
  if (errorTitle) {
    errorTitle.textContent = title;
  }
  errorMessage.textContent = msg;
}

/**
 * Clear output panel to initial state
 */
function clearOutputAndError() {
  currentRawRefinedPrompt = '';
  emptyState.hidden = true;
  outputContentWrapper.hidden = true;
  errorContainer.hidden = true;
  copyBtn.hidden = true;
  outputText.textContent = '';
  errorMessage.textContent = '';
}

/**
 * Handle copy to clipboard
 */
async function handleCopy() {
  const text = currentRawRefinedPrompt || outputText.textContent;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);

    copyBtn.classList.add('copied');
    copyBtnText.textContent = 'Copied';
    copyBtn.setAttribute('aria-label', 'Copied to clipboard');

    clearTimeout(copyResetTimer);
    copyResetTimer = setTimeout(() => {
      copyBtn.classList.remove('copied');
      copyBtnText.textContent = 'Copy';
      copyBtn.setAttribute('aria-label', 'Copy refined prompt to clipboard');
    }, 1500);
  } catch (error) {
    console.error('Clipboard copy failed:', error);
    try {
      const range = document.createRange();
      range.selectNodeContents(outputText);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand('copy');

      copyBtn.classList.add('copied');
      copyBtnText.textContent = 'Copied';
      clearTimeout(copyResetTimer);
      copyResetTimer = setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyBtnText.textContent = 'Copy';
      }, 1500);
    } catch (fallbackErr) {
      showError('Unable to copy automatically. Please select the text and press Ctrl+C.', 'Clipboard notice');
    }
  }
}

/**
 * Helper: Promise wrapper for chrome.storage.local.get with fallback
 */
function getFromStorage(keys) {
  return new Promise((resolve, reject) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result || {});
        }
      });
    } else {
      const result = {};
      try {
        keys.forEach((k) => {
          const val = localStorage.getItem(k);
          if (val !== null) {
            try {
              result[k] = JSON.parse(val);
            } catch {
              result[k] = val;
            }
          }
        });
        resolve(result);
      } catch (err) {
        reject(err);
      }
    }
  });
}

/**
 * Helper: Promise wrapper for chrome.storage.local.set with fallback
 */
function saveToStorage(items) {
  return new Promise((resolve, reject) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set(items, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    } else {
      try {
        Object.entries(items).forEach(([k, v]) => {
          localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
        });
        resolve();
      } catch (err) {
        reject(err);
      }
    }
  });
}
