import type { SkillSettingsState, SkillSettingsSource } from '@helm/core/browser';
import { useEffect, useRef, useState } from 'react';

import { Icon } from '../Icon';

export interface SkillsSectionProps {
  focused: boolean;
  onAddFolder: () => void;
  onAddGit: (url: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  settings: SkillSettingsState;
}

const sources: ReadonlyArray<{ id: SkillSettingsSource; label: string }> = [
  { id: 'builtin', label: 'Built-in' },
  { id: 'global', label: 'Global' },
  { id: 'workspace', label: 'Workspace' },
];

export function SkillsSection({
  focused,
  onAddFolder,
  onAddGit,
  onToggle,
  settings,
}: SkillsSectionProps): React.JSX.Element {
  const sectionRef = useRef<HTMLElement>(null);
  const [gitUrl, setGitUrl] = useState('');

  useEffect(() => {
    if (focused) sectionRef.current?.scrollIntoView({ block: 'start' });
  }, [focused]);

  return (
    <section className="grid gap-3 border-b border-[var(--helm-border)] py-4" ref={sectionRef}>
      <div>
        <h2 className="m-0 flex items-center gap-2 font-semibold">
          <Icon name="tools" /> Skills
        </h2>
        <p className="mt-1 mb-0 text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]">
          Short playbooks Helm loads on demand. Workspace skills override global and built-in
          skills.
        </p>
      </div>
      {sources.map((source) => {
        const items = settings.items.filter((item) => item.source === source.id);
        return (
          <div className="grid gap-1" key={source.id}>
            <strong className="text-[length:var(--helm-font-size-meta)] font-semibold">
              {source.label}
            </strong>
            {items.length === 0 ? (
              <span className="text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]">
                No {source.label.toLowerCase()} skills.
              </span>
            ) : (
              items.map((skill) => (
                <label
                  className="flex min-w-0 items-start gap-2 rounded-[var(--helm-radius-control)] px-1 py-1 hover:bg-[var(--helm-list-hover)]"
                  key={skill.id}
                >
                  <input
                    checked={skill.enabled}
                    onChange={(event) => onToggle(skill.id, event.target.checked)}
                    type="checkbox"
                  />
                  <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="flex min-w-0 flex-wrap items-center gap-1">
                      <code className="break-all">{skill.name}</code>
                      <span className="rounded-[var(--helm-radius-control)] border border-[var(--helm-border)] px-1 text-[10px] uppercase text-[var(--helm-description-foreground)]">
                        {source.label}
                      </span>
                      {skill.enabled && !skill.active && (
                        <span className="text-[10px] text-[var(--helm-description-foreground)]">
                          overridden
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 break-words text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]">
                      {firstSentence(skill.description)}
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
        );
      })}
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-[var(--helm-radius-control)] border border-[var(--helm-border)] bg-transparent px-2 py-1 hover:bg-[var(--helm-list-hover)]"
          onClick={onAddFolder}
          type="button"
        >
          Add skills folder…
        </button>
      </div>
      <div className="grid min-w-0 gap-1">
        <label htmlFor="skills-git-url">Add from Git URL…</label>
        <div className="flex min-w-0 gap-2">
          <input
            className="min-w-0 flex-1 rounded-[var(--helm-radius-control)] border border-[var(--helm-border)] bg-[var(--helm-input-background)] px-2 py-1 text-[var(--helm-input-foreground)] outline-none focus:border-[var(--helm-focus-border)]"
            id="skills-git-url"
            onChange={(event) => setGitUrl(event.target.value)}
            placeholder="https://github.com/owner/skills.git"
            type="url"
            value={gitUrl}
          />
          <button
            className="rounded-[var(--helm-radius-control)] border border-[var(--helm-border)] bg-transparent px-2 py-1 hover:bg-[var(--helm-list-hover)] disabled:opacity-60"
            disabled={!gitUrl.trim()}
            onClick={() => onAddGit(gitUrl.trim())}
            type="button"
          >
            Add
          </button>
        </div>
      </div>
      {settings.errors.length > 0 && (
        <div className="grid gap-1" role="alert">
          {settings.errors.map((error) => (
            <p
              className="m-0 flex min-w-0 items-start gap-1 break-words text-[length:var(--helm-font-size-meta)] text-[var(--helm-error)]"
              key={error}
            >
              <Icon className="shrink-0" name="error" /> <span>{error}</span>
            </p>
          ))}
        </div>
      )}
    </section>
  );
}

function firstSentence(description: string): string {
  return description.split(/(?<=[.!?])\s/u, 1)[0] ?? description;
}
