package com.pw.nexusnav.dto;

import jakarta.validation.constraints.NotBlank;

public class VerifyConfigRequest {
    @NotBlank
    private String password;

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
