import type { ParsedAchievement } from './parse-achievement-file'

// A structural subset of AchievementDefinition (steam-achievement-schema.ts) —
// duplicated rather than imported so this stays a leaf module. Importing the
// real type there would pull steamAuth.ts's whole dependency graph in wherever
// this file is reached from, including test-only cross-boundary imports.
interface ApinameSource {
    apiname: string
}

/**
 * Some emulator writers (the Uplay variant of Goldberg, confirmed against a
 * real achievements.json) key achievements by their bare 1-based position in
 * the schema rather than by apiname — `{"40": {...}}` instead of
 * `{"ACObsidian_Ach_40": {...}}`. Steam's GetSchemaForGame list is already in
 * that same order, so position is a reliable mapping back to a real apiname.
 *
 * Names that already match a known apiname pass through untouched.
 */
export function resolveAchievementNames(
    parsed: ParsedAchievement[],
    definitions: ApinameSource[],
): ParsedAchievement[] {
    if (definitions.length === 0) return parsed

    const knownApinames = new Set(definitions.map((d) => d.apiname))

    return parsed.map((achievement) => {
        if (knownApinames.has(achievement.name)) return achievement

        if (/^\d+$/.test(achievement.name)) {
            const position = Number(achievement.name)
            const definition = definitions[position - 1]
            if (definition) return { ...achievement, name: definition.apiname }
        }

        return achievement
    })
}
