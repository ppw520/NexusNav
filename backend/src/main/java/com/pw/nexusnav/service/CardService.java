package com.pw.nexusnav.service;

import com.pw.nexusnav.config.IpUtils;
import com.pw.nexusnav.dto.CardDTO;
import com.pw.nexusnav.dto.CardOrderItemDTO;
import com.pw.nexusnav.dto.CreateCardRequest;
import com.pw.nexusnav.dto.UpdateCardRequest;
import com.pw.nexusnav.entity.CardEntity;
import com.pw.nexusnav.repository.CardRepository;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CardService {

    private final CardRepository cardRepository;
    private final ConfigMutationService configMutationService;
    private final ConfigImportService configImportService;

    public CardService(
            CardRepository cardRepository,
            ConfigMutationService configMutationService,
            ConfigImportService configImportService
    ) {
        this.cardRepository = cardRepository;
        this.configMutationService = configMutationService;
        this.configImportService = configImportService;
    }

    public List<CardDTO> listCards(String groupId, String q, Boolean enabled, String clientIp) {
        return cardRepository.findAllByOrderByOrderIndexAscNameAsc()
                .stream()
                .filter(card -> !StringUtils.hasText(groupId) || card.getGroup().getId().equals(groupId))
                .filter(card -> enabled == null || card.isEnabled() == enabled)
                .filter(card -> {
                    if (!StringUtils.hasText(q)) {
                        return true;
                    }
                    String keyword = q.toLowerCase(Locale.ROOT);
                    return card.getName().toLowerCase(Locale.ROOT).contains(keyword)
                            || (card.getDescription() != null && card.getDescription().toLowerCase(Locale.ROOT).contains(keyword))
                            || resolveUrl(card, clientIp).toLowerCase(Locale.ROOT).contains(keyword);
                })
                .map(card -> toDto(card, clientIp))
                .toList();
    }

    public CardDTO getCard(String cardId, String clientIp) {
        CardEntity card = cardRepository.findById(cardId)
                .orElseThrow(() -> new IllegalArgumentException("Card not found: " + cardId));
        return toDto(card, clientIp);
    }

    public CardDTO create(CreateCardRequest request, String clientIp) {
        final String[] createdId = new String[1];
        configMutationService.mutateNav(nav -> {
            List<ConfigModel.GroupItem> groups = new ArrayList<>(nav.getGroups());
            List<ConfigModel.CardItem> cards = new ArrayList<>(nav.getCards());
            nav.setGroups(groups);
            nav.setCards(cards);

            if (groups.stream().noneMatch(group -> group.getId().equals(request.getGroupId()))) {
                throw new IllegalArgumentException("Group not found: " + request.getGroupId());
            }
            String cardId = StringUtils.hasText(request.getId()) ? request.getId().trim() : generateCardId(request.getName(), cards);
            if (cards.stream().anyMatch(card -> card.getId().equals(cardId))) {
                throw new IllegalArgumentException("Card already exists: " + cardId);
            }
            ConfigModel.CardItem item = new ConfigModel.CardItem();
            item.setId(cardId);
            item.setGroupId(request.getGroupId().trim());
            item.setName(request.getName().trim());
            item.setUrl(firstNonBlank(request.getUrl(), request.getLanUrl(), request.getWanUrl()));
            item.setLanUrl(emptyToNull(request.getLanUrl()));
            item.setWanUrl(emptyToNull(request.getWanUrl()));
            item.setOpenMode(normalizeOpenMode(request.getOpenMode()));
            item.setIcon(emptyToNull(request.getIcon()));
            item.setDescription(emptyToNull(request.getDescription()));
            item.setOrderIndex(request.getOrderIndex());
            item.setEnabled(request.isEnabled());
            item.setHealthCheckEnabled(request.isHealthCheckEnabled());
            ensureCardHasAddress(item);
            cards.add(item);
            createdId[0] = cardId;
        });

        return cardRepository.findById(createdId[0])
                .map(card -> toDto(card, clientIp))
                .orElseThrow(() -> new IllegalStateException("Card not found after creation: " + createdId[0]));
    }

    public CardDTO update(String cardId, UpdateCardRequest request, String clientIp) {
        configMutationService.mutateNav(nav -> {
            List<ConfigModel.GroupItem> groups = new ArrayList<>(nav.getGroups());
            List<ConfigModel.CardItem> cards = new ArrayList<>(nav.getCards());
            nav.setGroups(groups);
            nav.setCards(cards);

            if (groups.stream().noneMatch(group -> group.getId().equals(request.getGroupId()))) {
                throw new IllegalArgumentException("Group not found: " + request.getGroupId());
            }
            ConfigModel.CardItem target = cards.stream()
                    .filter(card -> card.getId().equals(cardId))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Card not found: " + cardId));
            target.setGroupId(request.getGroupId().trim());
            target.setName(request.getName().trim());
            target.setUrl(firstNonBlank(request.getUrl(), request.getLanUrl(), request.getWanUrl()));
            target.setLanUrl(emptyToNull(request.getLanUrl()));
            target.setWanUrl(emptyToNull(request.getWanUrl()));
            target.setOpenMode(normalizeOpenMode(request.getOpenMode()));
            target.setIcon(emptyToNull(request.getIcon()));
            target.setDescription(emptyToNull(request.getDescription()));
            target.setOrderIndex(request.getOrderIndex());
            target.setEnabled(request.isEnabled());
            target.setHealthCheckEnabled(request.isHealthCheckEnabled());
            ensureCardHasAddress(target);
        });

        return cardRepository.findById(cardId)
                .map(card -> toDto(card, clientIp))
                .orElseThrow(() -> new IllegalStateException("Card not found after update: " + cardId));
    }

    public void delete(String cardId) {
        configMutationService.mutateNav(nav -> {
            List<ConfigModel.CardItem> cards = new ArrayList<>(nav.getCards());
            boolean removed = cards.removeIf(card -> card.getId().equals(cardId));
            if (!removed) {
                throw new IllegalArgumentException("Card not found: " + cardId);
            }
            nav.setCards(cards);
        });
    }

    public int updateOrder(List<CardOrderItemDTO> items) {
        Set<String> ids = items.stream().map(CardOrderItemDTO::getId).collect(Collectors.toSet());
        Map<String, Integer> orderMap = items.stream()
                .collect(Collectors.toMap(CardOrderItemDTO::getId, CardOrderItemDTO::getOrderIndex, (a, b) -> b));
        configMutationService.mutateNav(nav -> {
            List<ConfigModel.CardItem> cards = new ArrayList<>(nav.getCards());
            boolean anyMissing = ids.stream().anyMatch(id -> cards.stream().noneMatch(card -> card.getId().equals(id)));
            if (anyMissing) {
                throw new IllegalArgumentException("Some cards do not exist");
            }
            for (ConfigModel.CardItem card : cards) {
                Integer order = orderMap.get(card.getId());
                if (order != null) {
                    card.setOrderIndex(order);
                }
            }
            nav.setCards(cards);
        });
        return items.size();
    }

    public List<CardEntity> listEnabledEntities() {
        return cardRepository.findAllByOrderByOrderIndexAscNameAsc()
                .stream()
                .filter(CardEntity::isEnabled)
                .toList();
    }

    private CardDTO toDto(CardEntity card, String clientIp) {
        return new CardDTO(
                card.getId(),
                card.getGroup().getId(),
                card.getName(),
                resolveUrl(card, clientIp),
                emptyToNull(card.getLanUrl()),
                emptyToNull(card.getWanUrl()),
                normalizeOpenMode(card.getOpenMode()),
                card.getIcon(),
                card.getDescription(),
                card.getOrderIndex(),
                card.isEnabled(),
                card.isHealthCheckEnabled()
        );
    }

    private String resolveUrl(CardEntity card, String clientIp) {
        String mode = resolveEffectiveNetworkMode(clientIp);
        String preferred = ConfigModel.NETWORK_MODE_LAN.equals(mode) ? card.getLanUrl() : card.getWanUrl();
        if (StringUtils.hasText(preferred)) {
            return preferred;
        }

        String fallback = ConfigModel.NETWORK_MODE_LAN.equals(mode) ? card.getWanUrl() : card.getLanUrl();
        if (StringUtils.hasText(fallback)) {
            return fallback;
        }

        return card.getUrl();
    }

    private String resolveEffectiveNetworkMode(String clientIp) {
        String preference = configImportService.getSystemConfig().getNetworkModePreference();
        if (ConfigModel.NETWORK_MODE_LAN.equals(preference) || ConfigModel.NETWORK_MODE_WAN.equals(preference)) {
            return preference;
        }
        return IpUtils.isLanIp(clientIp) ? ConfigModel.NETWORK_MODE_LAN : ConfigModel.NETWORK_MODE_WAN;
    }

    private void ensureCardHasAddress(ConfigModel.CardItem item) {
        if (!StringUtils.hasText(firstNonBlank(item.getUrl(), item.getLanUrl(), item.getWanUrl()))) {
            throw new IllegalArgumentException("Card url is required");
        }
    }

    private String generateCardId(String name, List<ConfigModel.CardItem> cards) {
        String slug = name.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        if (!StringUtils.hasText(slug)) {
            slug = "card";
        }
        String candidate = slug;
        int counter = 2;
        while (containsCardId(cards, candidate)) {
            candidate = slug + "-" + counter++;
        }
        return candidate + "-" + UUID.randomUUID().toString().substring(0, 6);
    }

    private boolean containsCardId(List<ConfigModel.CardItem> cards, String cardId) {
        for (ConfigModel.CardItem card : cards) {
            if (card.getId().equals(cardId)) {
                return true;
            }
        }
        return false;
    }

    private String normalizeOpenMode(String openMode) {
        if (!StringUtils.hasText(openMode)) {
            return "iframe";
        }
        String normalized = openMode.toLowerCase(Locale.ROOT);
        if ("new_tab".equals(normalized)) {
            return "newtab";
        }
        if (!normalized.equals("iframe") && !normalized.equals("newtab") && !normalized.equals("auto")) {
            throw new IllegalArgumentException("Invalid openMode: " + openMode);
        }
        return normalized;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }

    private String emptyToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
