package com.civic.backend.reward;

import com.civic.backend.reward.dto.BadgeDto;
import com.civic.backend.reward.dto.RewardLevelDto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Civic rewards rules — the server-side single source of truth for how levels
 * and badges are calculated. Deliberately mirrors the frontend's pure engine
 * (frontend/src/rewards/engine.ts): same LEVELS ladder, same BADGES catalogue
 * and targets, so citizen and authority views always agree with the server.
 *
 * Point VALUES per action live on {@link RewardActivityType}. This class owns
 * the level thresholds and badge definitions and the pure functions that turn a
 * point total + {@link RewardStats} into UI-ready level/badge shapes.
 */
public final class RewardRules {

    private RewardRules() {}

    // -----------------------------------------------------------------------
    // Level ladder — cumulative point thresholds, lowest to highest.
    // -----------------------------------------------------------------------

    public record LevelDef(int level, String name, int minPoints) {}

    public static final List<LevelDef> LEVELS = List.of(
            new LevelDef(1, "New Resident", 0),
            new LevelDef(2, "Neighborhood Watch", 200),
            new LevelDef(3, "Community Advocate", 500),
            new LevelDef(4, "Civic Champion", 1000),
            new LevelDef(5, "City Guardian", 2000),
            new LevelDef(6, "Civic Legend", 4000)
    );

    /** Resolve the level (and the next threshold) for a given point total. */
    public static RewardLevelDto levelForPoints(int points) {
        int idx = 0;
        for (int i = 0; i < LEVELS.size(); i++) {
            if (points >= LEVELS.get(i).minPoints()) idx = i;
        }
        LevelDef current = LEVELS.get(idx);
        Integer next = idx < LEVELS.size() - 1 ? LEVELS.get(idx + 1).minPoints() : null;
        return RewardLevelDto.builder()
                .level(current.level())
                .name(current.name())
                .minPoints(current.minPoints())
                .nextLevelPoints(next)
                .build();
    }

    // -----------------------------------------------------------------------
    // Badge catalogue — each badge measures one stat against a target.
    // -----------------------------------------------------------------------

    @FunctionalInterface
    public interface Measure {
        int apply(RewardStats s, int points, int level);
    }

    public record BadgeDef(String id, String name, String description, String icon,
                           int target, Measure measure) {}

    public static final List<BadgeDef> BADGES = List.of(
            new BadgeDef("first-steps", "First Steps", "File your very first civic report.", "🌱",
                    1, (s, p, l) -> s.reportsSubmitted()),
            new BadgeDef("reporter", "Reporter", "Submit 5 reports.", "📣",
                    5, (s, p, l) -> s.reportsSubmitted()),
            new BadgeDef("prolific-reporter", "Prolific Reporter", "Submit 25 reports.", "🏅",
                    25, (s, p, l) -> s.reportsSubmitted()),
            new BadgeDef("pothole-patrol", "Pothole Patrol", "Report 5 potholes.", "🕳️",
                    5, (s, p, l) -> s.potholeReports()),
            new BadgeDef("clean-streets", "Clean Streets", "Report 5 garbage / waste issues.", "🧹",
                    5, (s, p, l) -> s.garbageReports()),
            new BadgeDef("night-watch", "Night Watch", "Report 3 broken streetlights.", "🔦",
                    3, (s, p, l) -> s.streetlightReports()),
            new BadgeDef("problem-solver", "Problem Solver", "Have 10 of your reports resolved.", "✅",
                    10, (s, p, l) -> s.reportsResolved()),
            new BadgeDef("week-warrior", "Week Warrior", "Keep a 7-day reporting streak.", "🔥",
                    7, (s, p, l) -> s.currentStreakDays()),
            new BadgeDef("sharp-eye", "Sharp Eye", "Submit a photo the AI classifies with 90%+ confidence.", "🎯",
                    90, (s, p, l) -> (int) Math.round(s.maxAiConfidence() * 100)),
            new BadgeDef("champion", "Civic Champion", "Reach Level 4.", "🏆",
                    4, (s, p, level) -> level)
    );

    /** Evaluate every badge against the given stats/points/level. */
    public static List<BadgeDto> evaluateBadges(RewardStats stats, int points, int level,
                                                Map<String, LocalDateTime> earnedDates) {
        List<BadgeDto> out = new ArrayList<>(BADGES.size());
        for (BadgeDef def : BADGES) {
            int current = Math.min(def.measure().apply(stats, points, level), def.target());
            boolean earned = current >= def.target();
            out.add(BadgeDto.builder()
                    .id(def.id())
                    .name(def.name())
                    .description(def.description())
                    .icon(def.icon())
                    .earned(earned)
                    .earnedDate(earned ? earnedDates.get(def.id()) : null)
                    .current(current)
                    .target(def.target())
                    .progressPercent(Math.min(100, (int) Math.round((current / (double) def.target()) * 100)))
                    .build());
        }
        return out;
    }
}
