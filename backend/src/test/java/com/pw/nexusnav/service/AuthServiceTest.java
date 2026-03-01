package com.pw.nexusnav.service;

import com.pw.nexusnav.exception.UnauthorizedException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AuthServiceTest {

    @Test
    void assertConfigMutationAuthorizedBypassesWhenNotRequired() {
        ConfigImportService configImportService = mock(ConfigImportService.class);
        ConfigModel.SystemModel systemModel = new ConfigModel.SystemModel();
        systemModel.getSecurity().setRequireAuthForConfig(false);
        when(configImportService.getSystemConfig()).thenReturn(systemModel);

        AuthService authService = new AuthService(configImportService);
        assertDoesNotThrow(() -> authService.assertConfigMutationAuthorized(null));
    }

    @Test
    void assertConfigMutationAuthorizedThrowsWhenTokenMissing() {
        ConfigImportService configImportService = mock(ConfigImportService.class);
        ConfigModel.SystemModel systemModel = new ConfigModel.SystemModel();
        systemModel.getSecurity().setRequireAuthForConfig(true);
        when(configImportService.getSystemConfig()).thenReturn(systemModel);

        AuthService authService = new AuthService(configImportService);
        assertThrows(UnauthorizedException.class, () -> authService.assertConfigMutationAuthorized(null));
    }

    @Test
    void assertConfigMutationAuthorizedConsumesTokenOnce() {
        ConfigImportService configImportService = mock(ConfigImportService.class);
        ConfigModel.SystemModel systemModel = new ConfigModel.SystemModel();
        systemModel.getSecurity().setRequireAuthForConfig(true);
        when(configImportService.getSystemConfig()).thenReturn(systemModel);

        AuthService authService = new AuthService(configImportService);
        String token = authService.createConfigVerifyToken();

        assertDoesNotThrow(() -> authService.assertConfigMutationAuthorized(token));
        assertThrows(UnauthorizedException.class, () -> authService.assertConfigMutationAuthorized(token));
    }
}
