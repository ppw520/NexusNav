package com.pw.nexusnav.service;

import com.pw.nexusnav.dto.ImportNavConfigRequest;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;

@Service
public class NavConfigService {

    private final ConfigMutationService configMutationService;
    private final CardTypeSchemaService cardTypeSchemaService;

    public NavConfigService(
            ConfigMutationService configMutationService,
            CardTypeSchemaService cardTypeSchemaService
    ) {
        this.configMutationService = configMutationService;
        this.cardTypeSchemaService = cardTypeSchemaService;
    }

    public ImportResult importNavConfig(ImportNavConfigRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("请求体不能为空");
        }
        if (request.getGroups() == null || request.getCards() == null) {
            throw new IllegalArgumentException("groups 和 cards 不能为空");
        }

        List<ConfigModel.GroupItem> groups = new ArrayList<>(request.getGroups().size());
        for (ImportNavConfigRequest.GroupItem source : request.getGroups()) {
            ConfigModel.GroupItem item = new ConfigModel.GroupItem();
            item.setId(trimToNull(source.getId()));
            item.setName(trimToNull(source.getName()));
            item.setOrderIndex(source.getOrderIndex());
            groups.add(item);
        }

        List<ConfigModel.CardItem> cards = new ArrayList<>(request.getCards().size());
        for (ImportNavConfigRequest.CardItem source : request.getCards()) {
            ConfigModel.CardItem item = new ConfigModel.CardItem();
            item.setId(trimToNull(source.getId()));
            item.setGroupId(trimToNull(source.getGroupId()));
            item.setName(trimToNull(source.getName()));
            String cardType = cardTypeSchemaService.normalizeCardType(source.getCardType());
            item.setCardType(cardType);
            item.setOpenMode(cardTypeSchemaService.normalizeOpenMode(source.getOpenMode()));
            item.setIcon(trimToNull(source.getIcon()));
            item.setDescription(trimToNull(source.getDescription()));
            item.setOrderIndex(source.getOrderIndex());
            item.setEnabled(source.isEnabled());
            item.setHealthCheckEnabled(cardTypeSchemaService.supportsHealthCheck(cardType) && source.isHealthCheckEnabled());
            item.setConfig(cardTypeSchemaService.normalizeConfig(cardType, source.getConfig()));
            item.setSecretRefs(normalizeSecretRefs(source.getSecretRefs()));
            cards.add(item);
        }

        configMutationService.mutateNav(nav -> {
            nav.setGroups(groups);
            nav.setCards(cards);
        });

        return new ImportResult(groups.size(), cards.size());
    }

    private LinkedHashMap<String, String> normalizeSecretRefs(LinkedHashMap<String, String> refs) {
        LinkedHashMap<String, String> normalized = new LinkedHashMap<>();
        if (refs == null || refs.isEmpty()) {
            return normalized;
        }
        refs.forEach((key, value) -> {
            if (!StringUtils.hasText(key)) {
                return;
            }
            normalized.put(key.trim(), StringUtils.hasText(value) ? value.trim() : null);
        });
        return normalized;
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    public record ImportResult(int groups, int cards) {
    }
}
