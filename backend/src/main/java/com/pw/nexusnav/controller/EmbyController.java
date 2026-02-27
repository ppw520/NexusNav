package com.pw.nexusnav.controller;

import com.pw.nexusnav.dto.ApiResponse;
import com.pw.nexusnav.dto.EmbyStatsDTO;
import com.pw.nexusnav.dto.EmbyTaskDTO;
import com.pw.nexusnav.dto.EmbyTaskRunResultDTO;
import com.pw.nexusnav.service.EmbyService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/emby/cards/{cardId}")
public class EmbyController {

    private final EmbyService embyService;

    public EmbyController(EmbyService embyService) {
        this.embyService = embyService;
    }

    @GetMapping("/stats")
    public ApiResponse<EmbyStatsDTO> getStats(@PathVariable String cardId) {
        return ApiResponse.ok(embyService.fetchStats(cardId));
    }

    @GetMapping("/tasks")
    public ApiResponse<List<EmbyTaskDTO>> listTasks(@PathVariable String cardId) {
        return ApiResponse.ok(embyService.listTasks(cardId));
    }

    @PostMapping("/tasks/{taskId}/run")
    public ApiResponse<EmbyTaskRunResultDTO> runTask(@PathVariable String cardId, @PathVariable String taskId) {
        return ApiResponse.ok(embyService.runTask(cardId, taskId));
    }
}
