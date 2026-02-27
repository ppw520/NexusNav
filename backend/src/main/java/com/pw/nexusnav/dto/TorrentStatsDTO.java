package com.pw.nexusnav.dto;

public record TorrentStatsDTO(
        long downloadSpeed,
        long uploadSpeed,
        int activeCount,
        int totalCount,
        TorrentStatusBreakdownDTO statusBreakdown,
        long updatedAt,
        String source
) {
}
