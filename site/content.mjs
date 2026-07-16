export const features = [
  {
    index: '01',
    tone: 'lime',
    kicker: 'Open-model harness',
    title: 'Make smaller models feel capable.',
    body: 'Provider-aware reasoning profiles, tool-call repair, loop detection, and fixture-backed evals help open-weight models stay useful through multi-step work.',
    detail: 'DeepSeek · Qwen · Kimi · GLM · Ollama',
  },
  {
    index: '02',
    tone: 'cyan',
    kicker: 'Progressive skills',
    title: 'Load expertise only when it matters.',
    body: 'Eleven built-in playbooks cover debugging, reviews, refactors, tests, documentation, security, and more. Add workspace or global SKILL.md files without bloating every prompt.',
    detail: 'Built-in · workspace · global',
  },
  {
    index: '03',
    tone: 'orange',
    kicker: 'CodeGraph',
    title: 'Ask architecture questions, not grep questions.',
    body: 'An optional local index maps symbols, callers, and source so the agent can answer blast-radius questions with one focused tool call.',
    detail: 'Callers · source · relationships',
  },
  {
    index: '04',
    tone: 'violet',
    kicker: 'Safety by mode',
    title: 'Start read-only. Add autonomy deliberately.',
    body: 'Chat, Agent, and Full Access modes make the permission boundary obvious. Native diffs, command approvals, checkpoints, and Undo keep changes reviewable.',
    detail: 'Chat · Agent · Full Access',
  },
  {
    index: '05',
    tone: 'lime',
    kicker: 'Bring your own provider',
    title: 'Your keys. Your model. Your bill.',
    body: 'Connect Anthropic, OpenAI, Google, OpenRouter, Ollama, Moonshot, Z.ai, DeepSeek, or DashScope. Credentials stay in VS Code SecretStorage.',
    detail: '9 provider routes · local Ollama',
  },
  {
    index: '06',
    tone: 'cyan',
    kicker: 'Useful context',
    title: 'Give the agent the right slice of work.',
    body: 'Mention files, folders, problems, and terminal output. Add guarded web search and fetch when current documentation matters.',
    detail: '@file · @folder · @problems · @terminal',
  },
];

export const comparisons = [
  {
    slug: 'cursor',
    competitor: 'Cursor',
    eyebrow: 'Helm vs Cursor',
    title: 'A focused VS Code agent or a new AI-first editor?',
    description:
      'Helm is a lightweight, bring-your-own-key agent inside VS Code. Cursor is a broader AI coding workspace with its own desktop and CLI experiences.',
    meta: 'Compare Helm and Cursor for model choice, VS Code workflow, privacy, skills, codebase context, and beginner setup.',
    summary:
      'Choose Helm when you want to keep VS Code, connect your own providers, run local Ollama, and add an explicit code graph. Choose Cursor when you want a full AI-first editor and its wider agent product.',
    helmBest:
      'Developers who want a smaller VS Code-native surface, direct provider configuration, local-model support, and no Helm account or backend.',
    competitorBest:
      'Developers who want an integrated AI editor, Cursor Desktop and CLI, or always-on product workflows managed inside one service.',
    sourceUrl: 'https://cursor.com/',
    sourceLabel: 'Cursor product overview',
    secondarySourceUrl: 'https://cursor.com/data-use',
    secondarySourceLabel: 'Cursor data-use overview',
    rows: [
      [
        'Primary surface',
        'VS Code extension; source CLI runner',
        'Cursor desktop workspace and Cursor CLI',
      ],
      [
        'Model access',
        'Your provider keys across nine routes, including Ollama',
        'Models and agents supplied through Cursor’s product experience',
      ],
      [
        'Account layer',
        'No Helm account, server, or telemetry',
        'Cursor service account with documented Privacy Mode controls',
      ],
      [
        'Codebase context',
        'Explicit mentions plus optional local CodeGraph',
        'Editor-native agent context and project workflows',
      ],
      [
        'Reusable guidance',
        'Built-in, workspace, and global SKILL.md playbooks',
        'Rules and Skills inside Cursor',
      ],
      [
        'Review boundary',
        'Chat, Agent, Full Access; native diffs and Undo',
        'Cursor’s editor and agent review workflows',
      ],
    ],
  },
  {
    slug: 'github-copilot',
    competitor: 'GitHub Copilot',
    eyebrow: 'Helm vs GitHub Copilot',
    title: 'Direct model control or the GitHub-native AI platform?',
    description:
      'Helm centers bring-your-own-key models and a local VS Code workflow. Copilot connects IDE assistance, code review, CLI, and cloud agents to the GitHub platform.',
    meta: 'Compare Helm and GitHub Copilot for BYOK models, VS Code agents, skills, code review, cloud workflows, and local control.',
    summary:
      'Choose Helm for direct provider configuration, open-weight and local models, and a compact reviewable harness. Choose Copilot for deep GitHub workflows and a broad managed product across IDE, CLI, and cloud agents.',
    helmBest:
      'Individuals who prioritize provider choice, local Ollama, CodeGraph, and a VS Code agent with no separate Helm account.',
    competitorBest:
      'Developers and organizations invested in GitHub who want completions, pull-request workflows, code review, CLI, and cloud agents under one subscription.',
    sourceUrl: 'https://docs.github.com/en/copilot/get-started/features',
    sourceLabel: 'GitHub Copilot features',
    secondarySourceUrl: 'https://docs.github.com/en/copilot/get-started/plans',
    secondarySourceLabel: 'GitHub Copilot plans',
    rows: [
      [
        'Primary surface',
        'VS Code extension; source CLI runner',
        'GitHub, multiple IDEs, CLI, and cloud agents',
      ],
      [
        'Model access',
        'Your provider keys and local Ollama',
        'Models and usage supplied through Copilot plans',
      ],
      [
        'Account layer',
        'No Helm account, backend, or telemetry',
        'GitHub account and Copilot plan',
      ],
      [
        'Codebase context',
        'Mentions plus optional local CodeGraph',
        'IDE context plus GitHub repository and pull-request workflows',
      ],
      [
        'Reusable guidance',
        'SKILL.md files with workspace/global precedence',
        'Custom agents and repository instructions',
      ],
      [
        'Review boundary',
        'Approval-gated diffs, commands, checkpoints, Undo',
        'IDE agent approvals, code review, and cloud pull requests',
      ],
    ],
  },
  {
    slug: 'kilo-code',
    competitor: 'Kilo Code',
    eyebrow: 'Helm vs Kilo Code',
    title: 'A compact local harness or an agent everywhere?',
    description:
      'Both products value model choice. Helm stays deliberately focused on VS Code, direct provider keys, skills, and a local code graph; Kilo spans IDEs, CLI, cloud, and a model gateway.',
    meta: 'Compare Helm and Kilo Code for open models, BYOK, VS Code, CLI, cloud agents, CodeGraph, skills, and setup complexity.',
    summary:
      'Choose Helm when you want the smallest path from VS Code to your own provider and a transparent local workflow. Choose Kilo when you want one broader agent across IDE, CLI, cloud, and its gateway ecosystem.',
    helmBest:
      'VS Code users who prefer a lean local agent, direct requests to configured providers, explicit permissions, progressive skills, and CodeGraph.',
    competitorBest:
      'Developers or teams who want many coding surfaces, gateway-backed model access, cloud agents, or cross-environment handoff.',
    sourceUrl: 'https://kilo.ai/',
    sourceLabel: 'Kilo product overview',
    secondarySourceUrl: 'https://kilo.ai/docs/',
    secondarySourceLabel: 'Kilo documentation',
    rows: [
      [
        'Primary surface',
        'VS Code extension; source CLI runner',
        'VS Code, JetBrains, CLI, cloud, and more',
      ],
      [
        'Model access',
        'Nine direct provider routes plus local Ollama',
        'Large model catalog, gateway, BYOK, and local options',
      ],
      [
        'Account layer',
        'No Helm account, server, or telemetry',
        'Local and managed Kilo product surfaces',
      ],
      [
        'Codebase context',
        'Explicit mentions plus optional local CodeGraph',
        'Agent modes across IDE and cloud workflows',
      ],
      [
        'Reusable guidance',
        'Eleven built-ins plus workspace/global skills',
        'Custom modes and broader agent ecosystem',
      ],
      [
        'Review boundary',
        'Three permission modes, native diffs, checkpoints, Undo',
        'Specialized modes and local/cloud agent controls',
      ],
    ],
  },
  {
    slug: 'claude-code',
    competitor: 'Claude Code',
    eyebrow: 'Helm vs Claude Code',
    title: 'Multi-provider control or the full Claude agent experience?',
    description:
      'Helm is model-agnostic and optimized for a range of frontier and open-weight providers. Claude Code is Anthropic’s agent across terminal, IDE, desktop, browser, and automation surfaces.',
    meta: 'Compare Helm and Claude Code for model providers, VS Code, CLI, skills, permissions, codebase context, and local open models.',
    summary:
      'Choose Helm for provider portability, Ollama, open-model profiles, and an optional local CodeGraph. Choose Claude Code when you want Anthropic’s complete agent product and its many first-party surfaces.',
    helmBest:
      'Developers who switch among providers, want local models, or want to inspect and tune a small TypeScript harness inside VS Code.',
    competitorBest:
      'Developers standardized on Claude who want Anthropic’s terminal, IDE, desktop, browser, hooks, plugins, and automation ecosystem.',
    sourceUrl: 'https://docs.anthropic.com/en/docs/claude-code/overview',
    sourceLabel: 'Claude Code overview',
    secondarySourceUrl: 'https://docs.anthropic.com/en/docs/claude-code/skills',
    secondarySourceLabel: 'Claude Code skills',
    rows: [
      [
        'Primary surface',
        'VS Code extension; source CLI runner',
        'Terminal, IDE, desktop, browser, and automation',
      ],
      [
        'Model access',
        'Nine provider routes including open-weight and local models',
        'Claude models through Anthropic’s product',
      ],
      [
        'Account layer',
        'No Helm account, server, or telemetry',
        'Anthropic account or supported cloud-provider setup',
      ],
      [
        'Codebase context',
        'Mentions plus optional local CodeGraph',
        'Claude Code’s agentic codebase and tool context',
      ],
      [
        'Reusable guidance',
        'Built-in, workspace, and global SKILL.md playbooks',
        'Claude Code skills, commands, plugins, and CLAUDE.md',
      ],
      [
        'Review boundary',
        'Chat, Agent, Full Access; native diffs and Undo',
        'Claude Code permissions and IDE diff workflows',
      ],
    ],
  },
];

export const faqs = [
  {
    question: 'Do I need an account?',
    answer:
      'No Helm account is required. The VS Code extension stores provider credentials in VS Code SecretStorage and sends model requests to the provider you configure.',
  },
  {
    question: 'Which model should a beginner choose?',
    answer:
      'OpenRouter is the simplest way to try several hosted models with one key. If you want fully local inference, install Ollama and start with a coding model such as Qwen Coder. Helm also supports Anthropic, OpenAI, Google, Moonshot, Z.ai, DeepSeek, and DashScope directly.',
  },
  {
    question: 'Can an open model really edit a project reliably?',
    answer:
      'That is the point of the harness. Helm adds provider-aware reasoning settings, tool-call repair, loop detection, focused context, approvals, and fixture-backed reliability evaluations. Model quality still matters, but the harness reduces avoidable failures around it.',
  },
  {
    question: 'What is a skill?',
    answer:
      'A skill is a compact SKILL.md playbook the agent loads only when a task needs it. Helm includes eleven practical skills and can discover additional workspace or global skills.',
  },
  {
    question: 'What does CodeGraph do?',
    answer:
      'CodeGraph creates an optional local index of symbols and relationships. It helps Helm answer questions such as “what calls this function?” or “what is the blast radius?” without reading a long chain of files.',
  },
  {
    question: 'Is the CLI ready for everyday use?',
    answer:
      'The repository currently includes a source CLI runner for evaluating the core harness. The VS Code extension is the polished beginner experience; the CLI path is best for developers who are comfortable cloning the repository and using pnpm.',
  },
];
