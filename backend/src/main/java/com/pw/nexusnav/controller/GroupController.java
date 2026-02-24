package com.pw.nexusnav.controller;

import com.pw.nexusnav.dto.ApiResponse;
import com.pw.nexusnav.dto.CreateGroupRequest;
import com.pw.nexusnav.dto.GroupDTO;
import com.pw.nexusnav.dto.UpdateGroupRequest;
import com.pw.nexusnav.service.GroupService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/groups")
public class GroupController {

    private final GroupService groupService;

    public GroupController(GroupService groupService) {
        this.groupService = groupService;
    }

    @GetMapping
    public ApiResponse<List<GroupDTO>> listGroups() {
        return ApiResponse.ok(groupService.listGroups());
    }

    @PostMapping
    public ApiResponse<GroupDTO> createGroup(@Valid @RequestBody CreateGroupRequest request) {
        return ApiResponse.ok(groupService.create(request));
    }

    @PostMapping("/{groupId}/update")
    public ApiResponse<GroupDTO> updateGroup(
            @PathVariable String groupId,
            @Valid @RequestBody UpdateGroupRequest request
    ) {
        return ApiResponse.ok(groupService.update(groupId, request));
    }

    @PostMapping("/{groupId}/delete")
    public ApiResponse<Void> deleteGroup(@PathVariable String groupId) {
        groupService.delete(groupId);
        return ApiResponse.ok(null);
    }
}
