# Session Handoff — 2026-02-16

## 1. What Was Completed

### Global CLAUDE.md created

- **File**: `~/.claude/CLAUDE.md`
- 5 sections ajoutées : Development Workflow, Debugging Guidelines (avec protocole 4 étapes), Frontend Development, Testing, Task Agent Usage

### Hooks configurés

- **File**: `~/.claude/settings.json`
- Hook `PostToolUse` ajouté : lance `pnpm vitest run` automatiquement après chaque `Edit` ou `Write`
- Matcher : `Edit|Write`, timeout 120s

### Custom Skills (4 skills globaux)

| Skill          | Fichier                                    | Commande          | Description                                                                                                                                                |
| -------------- | ------------------------------------------ | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BMAD Implement | `~/.claude/skills/bmad-implement/SKILL.md` | `/bmad-implement` | Implémenter un epic entier par batches de 3-4 agents, checkpoint sur disque, comparaison baseline tests                                                    |
| Orchestrate    | `~/.claude/skills/orchestrate/SKILL.md`    | `/orchestrate`    | Orchestration résiliente générique avec manifest JSON, retries auto (max 2), regression gate tous les 5 agents, checkpoint auto quand le contexte est long |
| TDD            | `~/.claude/skills/tdd/SKILL.md`            | `/tdd`            | Développement strict Red-Green-Refactor : tests d'abord, regression gate obligatoire, jamais affaiblir les assertions                                      |
| Debug          | `~/.claude/skills/debug/SKILL.md`          | `/debug`          | Investigation systématique en 3 phases (evidence → hypotheses → root cause report), aucun fix sans approbation explicite                                   |

### Script headless batch implementation

- **File**: `~/Documents/dev/batch-implement-stories.sh`
- Itère sur les stories d'un epic et lance chacune en headless mode Claude
- Résultats écrits dans `logs/`

## 2. What's Still in Progress

- Aucune implémentation de story en cours — session dédiée à la configuration de l'outillage Claude Code

## 3. Current Test Count

- Non vérifié cette session (pas de changements de code applicatif)
- Dernière baseline connue : ~2800+ tests (post Epic 1 + Story 2.1)

## 4. Next Steps

```bash
# Tester le hook PostToolUse sur un edit quelconque dans CORTEX
cd ~/Documents/dev/cortex-clinical-affairs && claude

# Tester les skills
# /bmad-implement — orchestration d'un epic
# /orchestrate implement all stories in epic-5/ — orchestration générique
# /tdd add PDF export to CER reports — dev test-driven
# /debug screening returns empty array — investigation de bug

# Avant d'utiliser le batch script, créer le dossier logs
mkdir -p ~/Documents/dev/cortex-clinical-affairs/logs

# Lancer le batch script (adapter le chemin des stories)
cd ~/Documents/dev/cortex-clinical-affairs && ~/Documents/dev/batch-implement-stories.sh
```

## 5. Known Issues & Blockers

- **Hook global** : Le hook Vitest est dans `~/.claude/settings.json` (global). Il tournera sur TOUS les projets, y compris Jarvis (Python). Envisager de le déplacer dans `cortex-clinical-affairs/.claude/settings.json` si ça pose problème.
- **Batch script** : Le chemin `docs/bmad/stories/epic-4/*.md` est hardcodé. Adapter selon l'epic à implémenter. Le dossier `logs/` doit exister avant exécution.
- **Skill BMAD** : Référence `_bmad-output/implementation-artifacts/` pour les epics et `_bmad-output/checkpoints/` pour les checkpoints — vérifier que ces chemins correspondent à la structure réelle du projet.
