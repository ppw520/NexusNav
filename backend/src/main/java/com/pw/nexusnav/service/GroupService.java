package com.pw.nexusnav.service;

import com.pw.nexusnav.dto.CreateGroupRequest;
import com.pw.nexusnav.dto.GroupDTO;
import com.pw.nexusnav.dto.UpdateGroupRequest;
import com.pw.nexusnav.repository.GroupRepository;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class GroupService {

    private final GroupRepository groupRepository;
    private final ConfigMutationService configMutationService;

    public GroupService(
            GroupRepository groupRepository,
            ConfigMutationService configMutationService
    ) {
        this.groupRepository = groupRepository;
        this.configMutationService = configMutationService;
    }

    public List<GroupDTO> listGroups() {
        return groupRepository.findAllByOrderByOrderIndexAscNameAsc()
                .stream()
                .map(group -> new GroupDTO(group.getId(), group.getName(), group.getOrderIndex()))
                .toList();
    }

    public GroupDTO create(CreateGroupRequest request) {
        String targetId = StringUtils.hasText(request.getId()) ? request.getId().trim() : null;
        final String[] createdId = new String[1];

        configMutationService.mutateNav(nav -> {
            List<ConfigModel.GroupItem> groups = new ArrayList<>(nav.getGroups());
            List<ConfigModel.CardItem> cards = new ArrayList<>(nav.getCards());
            nav.setGroups(groups);
            nav.setCards(cards);

            String groupId = targetId;
            if (!StringUtils.hasText(groupId)) {
                groupId = generateGroupId(request.getName(), groups);
            }

            if (containsGroupId(groups, groupId)) {
                throw new IllegalArgumentException("Group already exists: " + groupId);
            }
            ConfigModel.GroupItem item = new ConfigModel.GroupItem();
            item.setId(groupId);
            item.setName(request.getName().trim());
            item.setOrderIndex(request.getOrderIndex());
            groups.add(item);
            createdId[0] = groupId;
        });

        String finalId = createdId[0];
        return groupRepository.findById(finalId)
                .map(group -> new GroupDTO(group.getId(), group.getName(), group.getOrderIndex()))
                .orElseThrow(() -> new IllegalStateException("Group not found after creation: " + finalId));
    }

    public GroupDTO update(String groupId, UpdateGroupRequest request) {
        configMutationService.mutateNav(nav -> {
            List<ConfigModel.GroupItem> groups = new ArrayList<>(nav.getGroups());
            nav.setGroups(groups);
            ConfigModel.GroupItem target = groups.stream()
                    .filter(group -> group.getId().equals(groupId))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Group not found: " + groupId));
            target.setName(request.getName().trim());
            target.setOrderIndex(request.getOrderIndex());
        });

        return groupRepository.findById(groupId)
                .map(group -> new GroupDTO(group.getId(), group.getName(), group.getOrderIndex()))
                .orElseThrow(() -> new IllegalStateException("Group not found after update: " + groupId));
    }

    public void delete(String groupId) {
        configMutationService.mutateNav(nav -> {
            List<ConfigModel.GroupItem> groups = new ArrayList<>(nav.getGroups());
            List<ConfigModel.CardItem> cards = new ArrayList<>(nav.getCards());
            boolean removed = groups.removeIf(group -> group.getId().equals(groupId));
            if (!removed) {
                throw new IllegalArgumentException("Group not found: " + groupId);
            }
            cards.removeIf(card -> groupId.equals(card.getGroupId()));
            nav.setGroups(groups);
            nav.setCards(cards);
        });
    }

    private String generateGroupId(String name, List<ConfigModel.GroupItem> groups) {
        String slug = name.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        if (!StringUtils.hasText(slug)) {
            slug = "group";
        }
        String candidate = slug;
        int counter = 2;
        while (containsGroupId(groups, candidate)) {
            candidate = slug + "-" + counter++;
        }
        return candidate;
    }

    private boolean containsGroupId(List<ConfigModel.GroupItem> groups, String groupId) {
        for (ConfigModel.GroupItem group : groups) {
            if (group.getId().equals(groupId)) {
                return true;
            }
        }
        return false;
    }
}
