package com.pw.nexusnav.dto;

import jakarta.validation.constraints.NotBlank;

public class CardOrderItemDTO {

    @NotBlank
    private String id;

    private int orderIndex;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public int getOrderIndex() {
        return orderIndex;
    }

    public void setOrderIndex(int orderIndex) {
        this.orderIndex = orderIndex;
    }
}
