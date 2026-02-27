package com.pw.nexusnav.dto;

public record EmbyStatsDTO(
        long mediaTotal,
        java.util.List<EmbyMediaBreakdownItemDTO> mediaBreakdown,
        int onlineSessions,
        int playingSessions,
        long updatedAt,
        String source
) {
}
