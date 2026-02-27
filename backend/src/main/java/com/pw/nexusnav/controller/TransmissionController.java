package com.pw.nexusnav.controller;

import com.pw.nexusnav.dto.ApiResponse;
import com.pw.nexusnav.dto.TorrentStatsDTO;
import com.pw.nexusnav.service.TransmissionService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/transmission/cards/{cardId}")
public class TransmissionController {

    private final TransmissionService transmissionService;

    public TransmissionController(TransmissionService transmissionService) {
        this.transmissionService = transmissionService;
    }

    @GetMapping("/stats")
    public ApiResponse<TorrentStatsDTO> getStats(@PathVariable String cardId) {
        return ApiResponse.ok(transmissionService.fetchStats(cardId));
    }
}
