library(tidyverse)

plot_bars <- function(dfn, ref) {
  ref <- ensym(ref)
  dfn %>%
    ggplot(aes(x = `Test Antigen`, y = !!ref)) +
    geom_bar(aes(fill = Type), stat = "identity") +
    geom_hline(yintercept = 50, lty = 2) +
    geom_text(aes(label = format(postGMT, digits = 0)), y = 1, vjust = 0, size = 3, colour = "white") +
    scale_fill_viridis_d(option = "A", begin = 0.5, end = 0.3) +
    facet_wrap(~ Agegroup + Centre, ncol = 1, scales = "free_y", strip.position = "left") +
    theme_bw() +
    labs(y = "Post-GMT Ratio") +
    theme(
      legend.position = "bottom",
      axis.text.x = element_text(angle = 30, hjust = 1)
    )
}

# reference antigens
refantigens <- read.csv(file = "ReferenceList_202202.csv", head = T, sep = ",") %>%
  distinct(Reference_Antigen)

refGMTs <- read_csv("hi_bartable.csv") %>%
  filter(`Test Antigen` %in% refantigens$Reference_Antigen) %>%
  select(Influenza_Type, Agegroup, Centre, postGMT, Type) %>%
  pivot_wider(
    id_cols = c(Influenza_Type, Agegroup, Centre), names_from = "Type",
    values_from = "postGMT"
  ) %>%
  rename(refGMTegg = egg, refGMTcell = cell) %>%
  as.data.frame()

# test antigens
testGMTs <- read_csv("hi_bartable.csv") %>%
  select(Influenza_Type, `Test Antigen`, Agegroup, Type, Centre, Passage_hist, postGMT) %>%
  left_join(refGMTs, by = c("Influenza_Type", "Agegroup", "Centre"), suffix = c("", ".y")) %>%
  mutate(
    GMTratio_egg = (postGMT / refGMTegg) * 100,
    GMTratio_cell = (postGMT / refGMTcell) * 100,
    `Test Antigen` = paste(`Test Antigen`, "\n", Passage_hist)
  )

color_agegroup_center_facets <- function(plot, agegroups, centers) {
  gtab <- ggplot_gtable(ggplot_build(plot))
  strip_both <- which(grepl("strip-", gtab$layout$name))

  agegroup_colors <- RColorBrewer::brewer.pal(length(agegroups), name = "PuRd")
  center_colors <- RColorBrewer::brewer.pal(length(centers), name = "PuRd")

  for (grob_index in strip_both) {
    for (child_grob_index in 1:length(gtab$grobs[[grob_index]]$grobs)) {
      title_index <- which(grepl("title", gtab$grobs[[grob_index]]$grobs[[child_grob_index]]$childrenOrder))
      strip_label <- gtab$grobs[[grob_index]]$grobs[[child_grob_index]]$children[[title_index]]$children[[1]]$label
      if (strip_label %in% agegroups) {
        color <- agegroup_colors[which(agegroups == strip_label)]
      } else {
        color <- center_colors[which(centers == strip_label)]
      }

      rect_index <- which(grepl("rect", gtab$grobs[[grob_index]]$grobs[[child_grob_index]]$childrenOrder))
      gtab$grobs[[grob_index]]$grobs[[child_grob_index]]$children[[rect_index]]$gp$fill <- color
    }
  }

  gtab
}

test_plot <- plot_bars(testGMTs %>% filter(Influenza_Type == "BVic"), ref = "refGMTcell")

influenzatypes <- unique(testGMTs$Influenza_Type)
reftypes <- c("GMTratio_egg", "GMTratio_cell")

agegroups <- unique(testGMTs$Agegroup)
centers <- unique(testGMTs$Centre)

for (influenzatype in influenzatypes) {
  for (reftype in reftypes) {
    data_subset <- testGMTs %>%
      filter(Influenza_Type == influenzatype)

    vertical_facet_count <- length(unique(data_subset$Agegroup)) * length(unique(data_subset$Centre))
    x_axis_entry_count <- length(unique(data_subset$`Test Antigen`))

    width <- x_axis_entry_count * 1.5 + 1
    height <- vertical_facet_count * 0.5 + 1.5

    pl <- data_subset %>%
      plot_bars(ref = reftype) %>% #+labs(title = "Egg-grown reference antigen")
      color_agegroup_center_facets(agegroups, centers)
    ggsave(paste0(influenzatype, reftype, "ref-barplot.pdf"), pl, height = height, width = width, limitsize = FALSE)
  }
}

#
# Scatter plots
#

hi202202 <- read_csv("hi202202.csv") %>%
  pivot_longer(contains("Titre"), names_to = "time", values_to = "titre") %>%
  mutate(titre = 5 * 2^(titre))

mn202202 <- read_csv("mn202202.csv") %>%
  pivot_longer(contains("Titre"), names_to = "time", values_to = "titre") %>%
  mutate(
    titre_less = str_detect(titre, "<"),
    titre_greater = str_detect(titre, ">"),
    titre = str_replace(titre, "<|>", "") %>% as.numeric(),
    titre = if_else(titre_less, titre / 2, titre),
    titre = if_else(titre_greater, titre * 2, titre),
  ) %>%
  select(-titre_less, -titre_greater)

scatter_data <- bind_rows(
  hi202202 %>% rename(vax = Vax),
  mn202202
)

scatter_data_for_visualiser <- scatter_data %>% 
  select(
    serum_id = Serum_No, cohort = Agegroup, virus = Test_Antigen,
    titre, subtype = "Influenza_Type", timepoint = time, egg_cell = Type, testing_lab = Centre,
  ) %>% 
  mutate(
    serum_source = "SerumSource",
    virus = if_else(egg_cell == "cell", virus, paste0(virus, "e")),
    timepoint = recode(timepoint, "Titre_wk0" = "Pre-vax", "Titre_wk4" = "Post-vax"),
    egg_cell = tools::toTitleCase(egg_cell),
    clade = "Clade",
    clade_freq = 1,
  )
write_csv(scatter_data_for_visualiser, "visualizer-data.csv")

summarise_logmean <- function(vec) {
  vec <- na.omit(vec)
  logvec <- log(vec)
  n <- length(vec)
  logmean <- mean(logvec)
  mean <- exp(logmean)
  logsd <- sd(logvec)
  logse <- logsd / sqrt(n)
  loglow <- logmean - 1.96 * logse
  loghigh <- logmean + 1.96 * logse
  low <- exp(loglow)
  high <- exp(loghigh)
  tibble(mean, low, high)
}

plot_scatter <- function(data) {
  test_antigens <- as.factor(data$Test_Antigen) %>%
    unique() %>%
    sort()
  times <- factor(data$time, c("Titre_wk0", "Titre_wk4")) %>% unique()

  get_xpos <- function(Test_Antigen, time) {
    as.numeric(as.factor(Test_Antigen)) +
        (as.numeric(factor(time, c("Titre_wk0", "Titre_wk4"))) - 1 - (length(times) - 1) / 2) * 0.2
  }

  means <- data %>% 
    group_by(Test_Antigen, Centre, Agegroup, time) %>% 
    summarise(summarise_logmean(titre), .groups = "drop") %>% 
    mutate(xpos = get_xpos(Test_Antigen, time), xpos_jit = xpos) 

  data %>%
    mutate(
      xpos = get_xpos(Test_Antigen, time),
      xpos_jit = xpos + runif(n(), -0.02, 0.02)
    ) %>%
    ggplot(aes(xpos_jit, titre, col = time)) +
    theme_bw() +
    theme(
      legend.position = "bottom",
      axis.text.x = element_text(angle = 30, hjust = 1),
    ) +
    facet_wrap(~ Agegroup + Centre, ncol = 1, strip.position = "left") +
    scale_y_log10("Titre", breaks = 5 * 2^(0:10)) +
    scale_x_continuous("Test Antigen", breaks = 1:length(test_antigens), labels = test_antigens) +
    scale_color_viridis_d(option = "A", begin = 0.5, end = 0.3) +
    guides(color = guide_legend(override.aes = list(alpha = 1))) +
    geom_line(aes(group = paste0(Test_Antigen, Agegroup, Centre, Serum_No)), alpha = 0) +
    geom_point(shape = 18, alpha = 0.3) + 
    geom_line(aes(y = mean, group = Test_Antigen), data = means) +
    geom_pointrange(aes(y = mean, ymin = low, ymax = high), data = means, size = 1, fatten = 2)
}

scatter_influenzatypes <- unique(scatter_data$Influenza_Type)
scatter_types <- unique(scatter_data$Type)

scatter_agegroups <- unique(scatter_data$Agegroup)
scatter_centers <- unique(scatter_data$Centre)

for (influenzatype in scatter_influenzatypes) {
  for (type in scatter_types) {
    data_subset <- scatter_data %>%
      filter(Influenza_Type == influenzatype, Type == type)

    vertical_facet_count <- length(unique(data_subset$Agegroup)) * length(unique(data_subset$Centre))
    x_axis_entry_count <- length(unique(data_subset$Test_Antigen))

    width <- x_axis_entry_count * 1.5 + 1
    height <- vertical_facet_count * 0.5 + 1.5

    pl <- data_subset %>%
      plot_scatter() %>%
      color_agegroup_center_facets(scatter_agegroups, scatter_centers)
    
    ggsave(
      paste0(str_replace(influenzatype, "/", ""), type, "ref-scatterplot.pdf"), pl, 
      height = height, width = width, limitsize = FALSE
    )
  }
}
