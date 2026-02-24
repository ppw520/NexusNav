package com.pw.nexusnav.controller;

import com.pw.nexusnav.dto.ApiResponse;
import com.pw.nexusnav.dto.ImportNavConfigRequest;
import com.pw.nexusnav.service.ConfigImportService;
import com.pw.nexusnav.service.NavConfigService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/config")
public class ConfigController {

    private final ConfigImportService configImportService;
    private final NavConfigService navConfigService;

    public ConfigController(ConfigImportService configImportService, NavConfigService navConfigService) {
        this.configImportService = configImportService;
        this.navConfigService = navConfigService;
    }

    @PostMapping("/reload")
    public ResponseEntity<ApiResponse<Map<String, Object>>> reload(
            @RequestParam(defaultValue = "false") boolean prune
    ) {
        ConfigImportService.ImportResult result = configImportService.importConfig(prune);
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "changed", result.changed(),
                "message", result.message(),
                "prune", prune
        )));
    }

    @PostMapping("/import-nav")
    public ResponseEntity<ApiResponse<Map<String, Object>>> importNav(
            @Valid @RequestBody ImportNavConfigRequest request
    ) {
        NavConfigService.ImportResult result = navConfigService.importNavConfig(request);
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "groups", result.groups(),
                "cards", result.cards(),
                "message", "Nav config imported"
        )));
    }
}
