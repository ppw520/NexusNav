package com.pw.nexusnav.controller;

import com.pw.nexusnav.config.IpUtils;
import com.pw.nexusnav.dto.ApiResponse;
import com.pw.nexusnav.dto.CardDTO;
import com.pw.nexusnav.dto.CardOrderItemDTO;
import com.pw.nexusnav.dto.CardTypeSchemaDTO;
import com.pw.nexusnav.dto.CreateCardRequest;
import com.pw.nexusnav.dto.UpdateCardRequest;
import com.pw.nexusnav.service.CardTypeSchemaService;
import com.pw.nexusnav.service.CardService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v2/cards")
public class CardController {

    private final CardService cardService;
    private final CardTypeSchemaService cardTypeSchemaService;

    public CardController(CardService cardService, CardTypeSchemaService cardTypeSchemaService) {
        this.cardService = cardService;
        this.cardTypeSchemaService = cardTypeSchemaService;
    }

    @GetMapping
    public ApiResponse<List<CardDTO>> listCards(
            @RequestParam(required = false) String groupId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Boolean enabled,
            HttpServletRequest request
    ) {
        String clientIp = IpUtils.extractClientIp(request.getHeader("X-Forwarded-For"), request.getRemoteAddr());
        return ApiResponse.ok(cardService.listCards(groupId, q, enabled, clientIp));
    }

    @GetMapping("/{cardId}")
    public ApiResponse<CardDTO> getCard(@PathVariable String cardId, HttpServletRequest request) {
        String clientIp = IpUtils.extractClientIp(request.getHeader("X-Forwarded-For"), request.getRemoteAddr());
        return ApiResponse.ok(cardService.getCard(cardId, clientIp));
    }

    @PostMapping
    public ApiResponse<CardDTO> createCard(
            @Valid @RequestBody CreateCardRequest payload,
            HttpServletRequest request
    ) {
        String clientIp = IpUtils.extractClientIp(request.getHeader("X-Forwarded-For"), request.getRemoteAddr());
        return ApiResponse.ok(cardService.create(payload, clientIp));
    }

    @PutMapping("/{cardId}")
    public ApiResponse<CardDTO> updateCard(
            @PathVariable String cardId,
            @Valid @RequestBody UpdateCardRequest payload,
            HttpServletRequest request
    ) {
        String clientIp = IpUtils.extractClientIp(request.getHeader("X-Forwarded-For"), request.getRemoteAddr());
        return ApiResponse.ok(cardService.update(cardId, payload, clientIp));
    }

    @DeleteMapping("/{cardId}")
    public ApiResponse<Void> deleteCard(@PathVariable String cardId) {
        cardService.delete(cardId);
        return ApiResponse.ok(null);
    }

    @PutMapping("/order")
    public ApiResponse<Map<String, Object>> updateOrder(@Valid @RequestBody List<CardOrderItemDTO> items) {
        int updated = cardService.updateOrder(items);
        return ApiResponse.ok(Map.of("updated", updated));
    }

    @GetMapping("/types")
    public ApiResponse<List<CardTypeSchemaDTO>> listCardTypes() {
        return ApiResponse.ok(cardTypeSchemaService.listSchemas());
    }
}
