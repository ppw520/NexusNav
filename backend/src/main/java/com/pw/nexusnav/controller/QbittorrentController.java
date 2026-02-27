package com.pw.nexusnav.controller;

import com.pw.nexusnav.dto.ApiResponse;
import com.pw.nexusnav.dto.TorrentStatsDTO;
import com.pw.nexusnav.service.QbittorrentService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/qbittorrent/cards/{cardId}")
public class QbittorrentController {

    private final QbittorrentService qbittorrentService;

    public QbittorrentController(QbittorrentService qbittorrentService) {
        this.qbittorrentService = qbittorrentService;
    }

    @GetMapping("/stats")
    public ApiResponse<TorrentStatsDTO> getStats(@PathVariable String cardId) {
        return ApiResponse.ok(qbittorrentService.fetchStats(cardId));
    }
}
