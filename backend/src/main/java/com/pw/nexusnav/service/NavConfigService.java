package com.pw.nexusnav.service;

import com.pw.nexusnav.dto.ImportNavConfigRequest;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

@Service
public class NavConfigService {

    private final ConfigMutationService configMutationService;

    public NavConfigService(ConfigMutationService configMutationService) {
        this.configMutationService = configMutationService;
    }

    public ImportResult importNavConfig(ImportNavConfigRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("request is required");
        }
        if (request.getGroups() == null || request.getCards() == null) {
            throw new IllegalArgumentException("groups and cards are required");
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
            item.setLanUrl(trimToNull(source.getLanUrl()));
            item.setWanUrl(trimToNull(source.getWanUrl()));
            item.setUrl(firstNonBlank(trimToNull(source.getUrl()), item.getLanUrl(), item.getWanUrl()));
            item.setOpenMode(trimToNull(source.getOpenMode()));
            item.setCardType(trimToNull(source.getCardType()));
            item.setSshHost(trimToNull(source.getSshHost()));
            item.setSshPort(source.getSshPort());
            item.setSshUsername(trimToNull(source.getSshUsername()));
            item.setSshAuthMode(trimToNull(source.getSshAuthMode()));
            item.setEmbyApiKey(trimToNull(source.getEmbyApiKey()));
            item.setIcon(trimToNull(source.getIcon()));
            item.setDescription(trimToNull(source.getDescription()));
            item.setOrderIndex(source.getOrderIndex());
            item.setEnabled(source.isEnabled());
            item.setHealthCheckEnabled(source.isHealthCheckEnabled());
            cards.add(item);
        }

        configMutationService.mutateNav(nav -> {
            nav.setGroups(groups);
            nav.setCards(cards);
        });

        return new ImportResult(groups.size(), cards.size());
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }

    public record ImportResult(int groups, int cards) {
    }
}
