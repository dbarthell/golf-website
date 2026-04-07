import Foundation

// ── Shared data model ─────────────────────────────────────────────────────────
// Mirrors the TypeScript BagData shape written by useBagData.ts into the
// App Group UserDefaults under the key "bagData".

struct WidgetBagClub: Codable {
    let id: String
    let label: String
    let order: Int
    let hasPelz: Bool
}

struct WidgetBagEntry: Codable {
    let clubId: String
    let fullTotal: Int
    let fullCarry: Int?
    let pelzTotal: Int?
    let pelzCarry: Int?
    let pelzOverride: Bool
}

struct WidgetBagSettings: Codable {
    let pelzOffset: Double
}

struct WidgetBagData: Codable {
    let clubs: [WidgetBagClub]
    let entries: [WidgetBagEntry]
    let settings: WidgetBagSettings
}

// ── Row model used by the widget view ─────────────────────────────────────────

struct BagWidgetRow: Identifiable {
    let id: String
    let label: String
    let fullTotal: Int
    let fullCarry: Int?       // nil = not entered by user
    let flightedTotal: Int?   // nil = not applicable (woods/driver)
    let flightedCarry: Int?   // nil = not applicable or carry not entered
    let isEstimated: Bool
}

// ── App Group key ─────────────────────────────────────────────────────────────

let kAppGroup   = "group.com.zerobreakgolf.shared"
let kBagDataKey = "bagData"

// ── Load + compute rows ───────────────────────────────────────────────────────

func loadBagRows() -> [BagWidgetRow] {
    guard
        let defaults = UserDefaults(suiteName: kAppGroup),
        let json     = defaults.string(forKey: kBagDataKey),
        let data     = json.data(using: .utf8),
        let bag      = try? JSONDecoder().decode(WidgetBagData.self, from: data)
    else { return [] }

    let offset = bag.settings.pelzOffset

    return bag.clubs
        .filter { club in bag.entries.contains { $0.clubId == club.id && $0.fullTotal > 0 } }
        .sorted { a, b in a.order == b.order ? a.id < b.id : a.order < b.order }
        .reversed()
        .compactMap { club -> BagWidgetRow? in
            guard let entry = bag.entries.first(where: { $0.clubId == club.id }) else { return nil }

            let flighted: Int?
            let flightedCarry: Int?
            let estimated: Bool
            if club.hasPelz {
                if entry.pelzOverride, let pt = entry.pelzTotal {
                    flighted      = pt
                    flightedCarry = entry.pelzCarry
                    estimated     = false
                } else {
                    flighted      = Int((Double(entry.fullTotal) * (1 - offset / 100)).rounded())
                    flightedCarry = entry.fullCarry.map { Int((Double($0) * (1 - offset / 100)).rounded()) }
                    estimated     = true
                }
            } else {
                flighted      = nil
                flightedCarry = nil
                estimated     = false
            }

            return BagWidgetRow(
                id:             club.id,
                label:          club.label,
                fullTotal:      entry.fullTotal,
                fullCarry:      entry.fullCarry,
                flightedTotal:  flighted,
                flightedCarry:  flightedCarry,
                isEstimated:    estimated
            )
        }
}
