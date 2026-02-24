package com.pw.nexusnav.controller;

import com.pw.nexusnav.config.IpUtils;
import com.pw.nexusnav.dto.ApiResponse;
import com.pw.nexusnav.dto.AdminConfigDTO;
import com.pw.nexusnav.dto.AdminConfigUpdateRequest;
import com.pw.nexusnav.dto.SystemConfigDTO;
import com.pw.nexusnav.service.SystemConfigService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/system")
public class SystemController {

    private final SystemConfigService systemConfigService;

    public SystemController(SystemConfigService systemConfigService) {
        this.systemConfigService = systemConfigService;
    }

    @GetMapping("/config")
    public ApiResponse<SystemConfigDTO> getConfig(HttpServletRequest request) {
        String clientIp = IpUtils.extractClientIp(request.getHeader("X-Forwarded-For"), request.getRemoteAddr());
        return ApiResponse.ok(systemConfigService.getConfigForIp(clientIp));
    }

    @GetMapping("/admin-config")
    public ApiResponse<AdminConfigDTO> getAdminConfig() {
        return ApiResponse.ok(systemConfigService.getAdminConfig());
    }

    @PostMapping("/admin-config")
    public ApiResponse<AdminConfigDTO> updateAdminConfig(@Valid @RequestBody AdminConfigUpdateRequest request) {
        return ApiResponse.ok(systemConfigService.updateAdminConfig(request));
    }
}
