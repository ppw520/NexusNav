package com.pw.nexusnav.controller;

import com.pw.nexusnav.config.IpUtils;
import com.pw.nexusnav.dto.ApiResponse;
import com.pw.nexusnav.dto.AdminConfigDTO;
import com.pw.nexusnav.dto.AdminConfigUpdateRequest;
import com.pw.nexusnav.dto.SystemConfigDTO;
import com.pw.nexusnav.service.AuthService;
import com.pw.nexusnav.service.SystemConfigService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v2/system")
public class SystemController {

    private final SystemConfigService systemConfigService;
    private final AuthService authService;

    public SystemController(SystemConfigService systemConfigService, AuthService authService) {
        this.systemConfigService = systemConfigService;
        this.authService = authService;
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

    @PutMapping("/admin-config")
    public ApiResponse<AdminConfigDTO> updateAdminConfig(
            @Valid @RequestBody AdminConfigUpdateRequest request,
            @RequestHeader(value = AuthService.VERIFY_TOKEN_HEADER, required = false) String verifyToken
    ) {
        authService.assertConfigMutationAuthorized(verifyToken);
        return ApiResponse.ok(systemConfigService.updateAdminConfig(request));
    }
}
